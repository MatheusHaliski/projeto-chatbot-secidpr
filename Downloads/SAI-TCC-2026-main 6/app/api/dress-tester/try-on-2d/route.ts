import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getAdminStorageBucket } from '@/app/lib/firebaseAdmin';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type GarmentCategory = 'tops' | 'bottoms' | 'full-body';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { garmentId: string; garmentImageUrl: string; garmentCategory: GarmentCategory; mannequinImageUrl: string };
    if (!body.garmentId || !body.garmentImageUrl || !body.garmentCategory || !body.mannequinImageUrl) {
      return NextResponse.json({ status: 'error', resultImageUrl: null, error: 'Invalid payload.' }, { status: 400 });
    }

    // Fetch the garment image first so remove.bg gets raw bytes regardless of whether
    // the source URL is publicly reachable (e.g. Firebase Storage signed URLs).
    const garmentFetch = await fetch(body.garmentImageUrl);
    if (!garmentFetch.ok) {
      return NextResponse.json({ status: 'error', resultImageUrl: null, error: `Could not fetch garment image (${garmentFetch.status}).` }, { status: 502 });
    }
    const garmentBuffer = Buffer.from(await garmentFetch.arrayBuffer());
    const contentType = garmentFetch.headers.get('content-type') ?? 'image/jpeg';

    const removeBgForm = new FormData();
    removeBgForm.append('image_file', new Blob([garmentBuffer], { type: contentType }), 'garment.jpg');
    removeBgForm.append('size', 'auto');

    const removeBgRes = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': process.env.REMOVE_BG_API_KEY ?? '' },
      body: removeBgForm,
    });
    if (!removeBgRes.ok) {
      const errText = await removeBgRes.text().catch(() => '');
      console.error('[try-on-2d] remove.bg error', { status: removeBgRes.status, body: errText });
      return NextResponse.json({ status: 'error', resultImageUrl: null, error: `Background removal failed (${removeBgRes.status}): ${errText}` }, { status: 502 });
    }

    const cutoutBuffer = Buffer.from(await removeBgRes.arrayBuffer());
    const bucket = getAdminStorageBucket();
    const ts = Date.now();
    const garmentFilePath = `dress-tester-temp/${body.garmentId}-${ts}.png`;
    const garmentFile = bucket.file(garmentFilePath);
    await garmentFile.save(cutoutBuffer, { metadata: { contentType: 'image/png' } });
    await garmentFile.makePublic();
    const publicGarmentUrl = `https://storage.googleapis.com/${bucket.name}/${garmentFilePath}`;

    // Upload the mannequin image to Firebase Storage so fashn.ai (an external service)
    // can fetch it — it cannot reach localhost or private network addresses.
    const mannequinFetch = await fetch(body.mannequinImageUrl);
    if (!mannequinFetch.ok) {
      return NextResponse.json({ status: 'error', resultImageUrl: null, error: `Could not fetch mannequin image (${mannequinFetch.status}).` }, { status: 502 });
    }
    const mannequinBuffer = Buffer.from(await mannequinFetch.arrayBuffer());
    const mannequinContentType = mannequinFetch.headers.get('content-type') ?? 'image/png';
    const mannequinFilePath = `dress-tester-temp/mannequin-${ts}.png`;
    const mannequinFile = bucket.file(mannequinFilePath);
    await mannequinFile.save(mannequinBuffer, { metadata: { contentType: mannequinContentType } });
    await mannequinFile.makePublic();
    const publicMannequinUrl = `https://storage.googleapis.com/${bucket.name}/${mannequinFilePath}`;

    const fashnBody = {
      model_name: 'tryon-v1.6',
      inputs: { model_image: publicMannequinUrl, garment_image: publicGarmentUrl, category: body.garmentCategory },
    };
    console.log('[try-on-2d] fashn.ai request', fashnBody);
    const fashnRunRes = await fetch('https://api.fashn.ai/v1/run', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.FASHN_API_KEY ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fashnBody),
    });
    const fashnRunRaw = await fashnRunRes.text();
    console.log('[try-on-2d] fashn.ai response', { status: fashnRunRes.status, body: fashnRunRaw });
    const fashnRunPayload = JSON.parse(fashnRunRaw) as { id?: string; predictionId?: string; error?: string; message?: string };
    const predictionId = fashnRunPayload.predictionId ?? fashnRunPayload.id;
    if (!fashnRunRes.ok || !predictionId) {
      const detail = fashnRunPayload.error ?? fashnRunPayload.message ?? fashnRunRaw;
      return NextResponse.json({ status: 'error', resultImageUrl: null, error: `Virtual try-on request failed (${fashnRunRes.status}): ${detail}` }, { status: 502 });
    }

    const start = Date.now();
    while (Date.now() - start < 60000) {
      await sleep(1500);
      const statusRes = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, { headers: { Authorization: `Bearer ${process.env.FASHN_API_KEY ?? ''}` } });
      const statusPayload = await statusRes.json() as { status?: string; output?: string | string[]; resultImageUrl?: string; error?: unknown };
      if (statusPayload.status === 'completed') {
        const rawOutput = statusPayload.output;
        const resultImageUrl = statusPayload.resultImageUrl ?? (Array.isArray(rawOutput) ? rawOutput[0] : rawOutput) ?? null;
        if (resultImageUrl) {
          await getAdminFirestore().collection('sai-wardrobeItems').doc(body.garmentId).set(
            {
              tryOn2dResultUrl: resultImageUrl,
              updated_at: new Date().toISOString(),
            },
            { merge: true },
          );
        }
        return NextResponse.json({ status: 'completed', resultImageUrl, error: null });
      }
      if (statusPayload.status === 'error' || statusPayload.status === 'failed') {
        const errRaw = statusPayload.error;
        const errMsg = typeof errRaw === 'string' ? errRaw : (errRaw && typeof errRaw === 'object' ? ((errRaw as { message?: string }).message ?? JSON.stringify(errRaw)) : 'Virtual try-on failed.');
        return NextResponse.json({ status: 'error', resultImageUrl: null, error: errMsg }, { status: 502 });
      }
    }

    return NextResponse.json({ status: 'error', resultImageUrl: null, error: 'Virtual try-on timed out.' }, { status: 504 });
  } catch (error) {
    return NextResponse.json({ status: 'error', resultImageUrl: null, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
