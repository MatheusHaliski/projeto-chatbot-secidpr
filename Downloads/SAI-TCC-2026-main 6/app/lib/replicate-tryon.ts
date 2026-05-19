const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN ?? '';
const MODEL_VERSION = process.env.REPLICATE_VTON_MODEL_VERSION ?? '';

const MAX_POLL_ATTEMPTS = 30;
const POLL_DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runVirtualTryOn(params: {
  garmentImageUrl: string;
  modelImageUrl: string;
}): Promise<string | null> {
  if (!REPLICATE_API_TOKEN || !MODEL_VERSION) {
    console.warn('[replicate-tryon] REPLICATE_API_TOKEN or REPLICATE_VTON_MODEL_VERSION not configured.');
    return null;
  }

  let predictionId: string;
  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: {
          garm_img: params.garmentImageUrl,
          human_img: params.modelImageUrl,
          garment_des: 'fashion clothing item',
          is_checked: true,
          is_checked_crop: false,
          denoise_steps: 30,
          seed: 42,
        },
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error('[replicate-tryon] failed to create prediction:', details);
      return null;
    }

    const prediction = (await response.json()) as { id: string };
    predictionId = prediction.id;
  } catch (error) {
    console.error('[replicate-tryon] network error creating prediction:', error);
    return null;
  }

  return pollPrediction(predictionId);
}

async function pollPrediction(predictionId: string): Promise<string | null> {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_DELAY_MS);

    try {
      const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
      });

      if (!response.ok) {
        console.error('[replicate-tryon] poll failed with status', response.status);
        return null;
      }

      const data = (await response.json()) as { status: string; output?: unknown };

      if (data.status === 'succeeded') {
        const output = data.output;
        if (Array.isArray(output) && typeof output[0] === 'string') return output[0];
        if (typeof output === 'string') return output;
        return null;
      }

      if (data.status === 'failed' || data.status === 'canceled') {
        console.warn('[replicate-tryon] prediction ended with status:', data.status);
        return null;
      }
    } catch (error) {
      console.error('[replicate-tryon] poll error on attempt', attempt, error);
      return null;
    }
  }

  console.warn('[replicate-tryon] prediction timed out after', MAX_POLL_ATTEMPTS, 'attempts');
  return null;
}
