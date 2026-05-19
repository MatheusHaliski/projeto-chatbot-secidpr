import { getAdminStorageBucket } from '@/app/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const ALLOWED_BINARY_MIME = new Set(['application/octet-stream', 'binary/octet-stream']);

const extensionFromMimeType = (mimeType: string) => {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'bin';
};

const extensionFromName = (name: string) => {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  return ext;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') ?? formData.get('file') ?? formData.get('asset');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Upload file is required.' }, { status: 400 });
    }

    const fileType = (file.type || '').toLowerCase();
    const inferredExtension = extensionFromName(file.name);
    const inferredFromMime = extensionFromMimeType(fileType);
    const binaryMime = ALLOWED_BINARY_MIME.has(fileType) || fileType.length === 0;
    const isImageMime = fileType.startsWith('image/');
    const isAllowedBinaryImage = binaryMime && ALLOWED_EXTENSIONS.has(inferredExtension);
    const isAllowed = isImageMime || isAllowedBinaryImage;

    if (!isAllowed) {
      return NextResponse.json({ error: 'Only image payloads are allowed (jpeg/png/webp/gif).' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image must be smaller than 8MB.' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const bucket = getAdminStorageBucket();
    const fileExtension = isImageMime ? extensionFromMimeType(fileType) : inferredExtension || inferredFromMime;
    const contentType = isImageMime ? fileType : `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
    const path = `wardrobe-images/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
    const bucketFile = bucket.file(path);
    const downloadToken = crypto.randomUUID();

    await bucketFile.save(fileBuffer, {
      metadata: {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
      resumable: false,
      public: false,
      validation: 'md5',
    });

    const encodedPath = encodeURIComponent(path);
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    return NextResponse.json({ image_url: imageUrl }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[upload-image] upload failed:', message);
    return NextResponse.json({ error: 'Unable to upload image.', detail: message }, { status: 500 });
  }
}
