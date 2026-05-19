#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

const MAX_BATCH_OPS = 500;
const DOC_CHUNK_SIZE = 100;
const BATCH_DELAY_MS = 150;

const COLLECTION_MAP = {
  'sai-brands': 'saiBrands',
  'sai-markets': 'saiMarkets',
  'sai-pieceItems': 'saiPieceItems',
  'sai-pipelineJobs': 'saiPipelineJobs',
  'sai-scheme': 'saiSchemes',
  'sai-schemeitem': 'saiSchemeItems',
  'sai-usercontrol': 'saiUsers',
  'sai-usersavedschemes': 'saiUserSavedSchemes',
  'sai-wardrobeItems': 'saiWardrobeItems',
  outfit_selection_2d: 'outfitSelections',
};

const INDEXES_PAYLOAD = {
  indexes: [
    {
      collectionGroup: 'saiBrands',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'is_active', order: 'ASCENDING' },
        { fieldPath: 'name', order: 'ASCENDING' },
      ],
    },
    {
      collectionGroup: 'saiUsers',
      queryScope: 'COLLECTION',
      fields: [{ fieldPath: 'email', order: 'ASCENDING' }],
    },
    {
      collectionGroup: 'saiUsers',
      queryScope: 'COLLECTION',
      fields: [{ fieldPath: 'createdAt', order: 'DESCENDING' }],
    },
    {
      collectionGroup: 'saiPipelineJobs',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    },
    {
      collectionGroup: 'saiWardrobeItems',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'userId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    },
    {
      collectionGroup: 'saiUserSavedSchemes',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'userId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    },
  ],
  fieldOverrides: [],
};

function parseArgs(argv) {
  const parsed = { dryRun: false, collection: null };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') parsed.dryRun = true;
    else if (arg.startsWith('--collection=')) parsed.collection = arg.split('=')[1]?.trim();
  }
  if (!parsed.dryRun) {
    parsed.dryRun = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';
  }
  return parsed;
}

function ts() {
  return new Date().toISOString().substring(11, 19);
}

function log(scope, message) {
  console.log(`[${ts()}] [${scope}] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function loadServiceAccount(keyPath) {
  if (!keyPath) throw new Error('SERVICE_ACCOUNT_KEY não definido.');
  const resolved = path.resolve(keyPath);
  if (!fs.existsSync(resolved)) throw new Error(`Service account key não encontrada: ${resolved}`);
  return require(resolved);
}

function convertIsoToTimestamp(value) {
  if (typeof value !== 'string') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return admin.firestore.Timestamp.fromDate(d);
}

function normalizeBaseFields(input, stats) {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === null) {
      stats.nullFieldsRemoved += 1;
      continue;
    }

    if (key === 'created_at' || key === 'createdAt') {
      const converted = convertIsoToTimestamp(value);
      output.createdAt = converted || value;
      if (converted) stats.dateFieldsConverted += 1;
      continue;
    }

    if (key === 'updated_at') {
      const converted = convertIsoToTimestamp(value);
      output.updatedAt = converted || value;
      if (converted) stats.dateFieldsConverted += 1;
      continue;
    }

    if (key === 'is_active' && typeof value === 'string') {
      output.is_active = value.toLowerCase() === 'true';
      stats.booleansNormalized += 1;
      continue;
    }

    if (key === 'passwordIterations' && typeof value === 'string') {
      const parsed = Number(value);
      output.passwordIterations = Number.isNaN(parsed) ? value : parsed;
      if (!Number.isNaN(parsed)) stats.numbersNormalized += 1;
      continue;
    }

    output[key] = value;
  }
  return output;
}

function isSemanticBrandId(id) {
  return id.startsWith('brand_');
}

async function flushOps(destDb, ops, dryRun) {
  const chunks = chunkArray(ops, MAX_BATCH_OPS);
  for (const [idx, chunk] of chunks.entries()) {
    if (dryRun) {
      log('DRY-RUN', `Batch ${idx + 1}/${chunks.length}: ${chunk.length} operações simuladas.`);
    } else {
      const batch = destDb.batch();
      for (const op of chunk) batch.set(op.ref, op.data, { merge: false });
      await batch.commit();
    }
    await sleep(BATCH_DELAY_MS);
  }
}

async function migrateCollection(sourceDb, destDb, sourceName, destName, dryRun, report) {
  log(destName, `Iniciando migração de ${sourceName} -> ${destName}.`);
  const snap = await sourceDb.collection(sourceName).get();
  const total = snap.size;

  const colStats = {
    sourceCollection: sourceName,
    destinationCollection: destName,
    sourceTotal: total,
    destinationTotalAfter: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
  };
  report.collections[destName] = colStats;

  const docsChunks = chunkArray(snap.docs, DOC_CHUNK_SIZE);
  let processed = 0;

  for (const docsChunk of docsChunks) {
    const ops = [];

    for (const doc of docsChunk) {
      try {
        const targetRef = destDb.collection(destName).doc(doc.id);
        const targetSnap = dryRun ? { exists: false } : await targetRef.get();
        if (targetSnap.exists) {
          colStats.skipped += 1;
          processed += 1;
          log(destName, `${processed}/${total} migrados (SKIP ${doc.id} já existe).`);
          continue;
        }

        const sourceData = doc.data();
        const normalized = normalizeBaseFields(sourceData, report.convertedFields);

        if (sourceName === 'sai-brands' && isSemanticBrandId(doc.id)) {
          normalized.slug = doc.id;
          report.convertedFields.slugAdded += 1;
        }

        if (destName === 'saiUsers') {
          const credentials = {
            passwordHash: normalized.passwordHash,
            passwordHashAlgorithm: normalized.passwordHashAlgorithm,
            passwordIterations: normalized.passwordIterations,
            passwordSalt: normalized.passwordSalt,
          };

          const userRoot = {
            name: normalized.name,
            email: normalized.email,
            createdAt: normalized.createdAt,
            updatedAt: normalized.updatedAt,
            is_active: normalized.is_active,
          };

          Object.keys(userRoot).forEach((k) => userRoot[k] === undefined && delete userRoot[k]);
          Object.keys(credentials).forEach((k) => credentials[k] === undefined && delete credentials[k]);

          ops.push({ ref: targetRef, data: userRoot });

          if (Object.keys(credentials).length > 0) {
            ops.push({ ref: targetRef.collection('credentials').doc('primary'), data: credentials });
            report.convertedFields.credentialsMoved += 1;
          }
        } else {
          ops.push({ ref: targetRef, data: normalized });
        }

        colStats.migrated += 1;
        processed += 1;
        log(destName, `${processed}/${total} migrados.`);
      } catch (err) {
        colStats.errors += 1;
        processed += 1;
        report.errors.push({ collection: sourceName, documentId: doc.id, reason: err.message });
        log(destName, `${processed}/${total} migrados (ERRO ${doc.id}: ${err.message}).`);
      }
    }

    await flushOps(destDb, ops, dryRun);
  }

  const finalCount = dryRun ? colStats.skipped + colStats.migrated : (await destDb.collection(destName).count().get()).data().count;
  colStats.destinationTotalAfter = finalCount;
}

async function main() {
  const args = parseArgs(process.argv);
  const startedAt = new Date();
  const serviceAccount = loadServiceAccount(process.env.SERVICE_ACCOUNT_KEY);

  const sourceApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }, 'source');
  const sourceDb = admin.firestore(sourceApp);
  sourceDb.settings({ databaseId: process.env.SOURCE_DB || '(default)' });

  const destApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }, 'dest');
  const destDb = admin.firestore(destApp);
  destDb.settings({ databaseId: process.env.DEST_DB || 'newsaidb' });

  const report = {
    startedAt: startedAt.toISOString(),
    finishedAt: null,
    durationSeconds: null,
    dryRun: args.dryRun,
    collectionFilter: args.collection,
    projectId: 'FuncionariosListaApp2025',
    databases: { source: process.env.SOURCE_DB || '(default)', destination: process.env.DEST_DB || 'newsaidb' },
    collections: {},
    convertedFields: {
      dateFieldsConverted: 0,
      nullFieldsRemoved: 0,
      booleansNormalized: 0,
      numbersNormalized: 0,
      credentialsMoved: 0,
      slugAdded: 0,
    },
    errors: [],
    status: 'SUCCESS',
  };

  try {
    const entries = Object.entries(COLLECTION_MAP);
    const filtered = args.collection
      ? entries.filter(([, dest]) => dest === args.collection)
      : entries;

    if (filtered.length === 0) {
      throw new Error(`Coleção inválida no filtro --collection=${args.collection}`);
    }

    for (const [sourceCollection, destCollection] of filtered) {
      await migrateCollection(sourceDb, destDb, sourceCollection, destCollection, args.dryRun, report);
    }

    fs.writeFileSync(path.resolve('firestore.indexes.json'), JSON.stringify(INDEXES_PAYLOAD, null, 2));
  } catch (err) {
    report.errors.push({ collection: 'GLOBAL', documentId: '-', reason: err.message });
  } finally {
    report.finishedAt = new Date().toISOString();
    report.durationSeconds = Number(((new Date(report.finishedAt) - startedAt) / 1000).toFixed(2));
    report.status = report.errors.length === 0 ? 'SUCCESS' : Object.keys(report.collections).length > 0 ? 'PARTIAL' : 'FAILED';
    fs.writeFileSync(path.resolve('migration-report.json'), JSON.stringify(report, null, 2));
    await Promise.allSettled([sourceApp.delete(), destApp.delete()]);
    log('SUMMARY', `Status: ${report.status} | Duração: ${report.durationSeconds}s | Dry-run: ${args.dryRun}`);
    if (report.errors.length > 0) process.exitCode = 1;
  }
}

main();
