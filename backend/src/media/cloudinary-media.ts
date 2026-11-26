import { v2 as cloudinary } from 'cloudinary';

// The single switch: uploads and /media both read it, so they cannot disagree.
export const cloudinaryEnabled = () => !!process.env.CLOUDINARY_URL;

// The SDK caches CLOUDINARY_URL at import time, before ConfigModule loads .env; config(true) re-reads it in place.
const sdk = () => (cloudinary.config(true), cloudinary);

// Folder lives in the public_id so upload, url and destroy all address the same asset.
const folder = 'mostrador';

// Stored path "<tenant>/products/<uuid>.webp" maps to public_id without extension; mp4 lives under resource_type video.
const parse = (path: string) => {
  const clean = path.replace(/^\/+/, '');
  const dot = clean.lastIndexOf('.');
  const ext = clean.slice(dot + 1);
  return { publicId: `${folder}/${clean.slice(0, dot)}`, ext, resource_type: ext === 'mp4' ? ('video' as const) : ('image' as const) };
};

export const cloudinaryUrl = (path: string) => {
  const { publicId, ext, resource_type } = parse(path);
  return sdk().url(publicId, { resource_type, format: ext, secure: true });
};

export const uploadMedia = (path: string, data: Buffer) => {
  const { publicId, resource_type } = parse(path);
  return new Promise<void>((resolve, reject) =>
    sdk()
      .uploader.upload_stream({ public_id: publicId, resource_type, overwrite: false }, (err) => (err ? reject(err) : resolve()))
      .end(data),
  );
};

// destroy resolves { result: 'not found' } instead of throwing; resource_type is required or videos are never deleted.
export const removeMedia = async (path: string) => {
  const { publicId, resource_type } = parse(path);
  await sdk().uploader.destroy(publicId, { resource_type, invalidate: true });
};
