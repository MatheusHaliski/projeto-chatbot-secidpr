# Firestore Migration `(default)` → `newsaidb`

Projeto: **FuncionariosListaApp2025**  
Runtime: **Node.js 18+**

## 1) Baixar a Service Account Key
1. Acesse o Firebase Console do projeto `FuncionariosListaApp2025`.
2. Vá em **Project settings** → **Service accounts**.
3. Clique em **Generate new private key**.
4. Salve o arquivo JSON em `./keys/serviceAccount.json`.

## 2) Instalar dependências
```bash
npm install firebase-admin dotenv
```

## 3) Configurar variáveis de ambiente
```bash
cp .env.example .env
```
Ajuste o `.env` se necessário.

## 4) Rodar dry-run (simulação)
```bash
node migrate.js --dry-run
```

## 5) Rodar migração completa
```bash
node migrate.js
```

## 6) Rodar migração de coleção específica
```bash
node migrate.js --collection=saiUsers
```

## 7) Verificar resultado no Firebase Console
1. Abra Firestore Database no projeto `FuncionariosListaApp2025`.
2. Selecione banco `newsaidb`.
3. Verifique as coleções de destino:
   - `saiBrands`
   - `saiMarkets`
   - `saiPieceItems`
   - `saiPipelineJobs`
   - `saiSchemes`
   - `saiSchemeItems`
   - `saiUsers`
   - `saiUserSavedSchemes`
   - `saiWardrobeItems`
   - `outfitSelections`
4. Na coleção `saiUsers`, confirme a subcoleção `credentials`.

## 8) Deploy dos índices
```bash
firebase deploy --only firestore:indexes --project funcionarioslistaapp2025
```

## Saídas geradas
- `migration-report.json`: relatório completo da execução.
- `firestore.indexes.json`: índices compostos para deploy.

## Observações
- O script ignora totalmente qualquer referência a `novobancosai1`.
- Logs sempre usam timestamp no formato `[HH:MM:SS]`.
- Em caso de erro por documento, a migração continua e o erro é registrado no relatório.
