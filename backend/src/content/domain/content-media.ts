import { detectImageType, IMAGE_MAX_BYTES } from "src/products/domain/product-image";

export { IMAGE_MAX_BYTES };
export const VIDEO_MAX_BYTES = 52_428_800;
export const VIDEO_MAX_SECONDS = 60;
export const IMAGE_MIN_SECONDS = 3;
export const IMAGE_MAX_SECONDS = 60;
export const PLAYLIST_MAX_ITEMS = 100;

export interface MediaKind {
    type: 'image' | 'video';
    ext: string;
    mime: string;
    maxBytes: number;
}

const IMAGE_MIMES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export const detectMedia = (buffer: Buffer): MediaKind | null => {
    const image = detectImageType(buffer);
    if (image) return { type: 'image', ext: image, mime: IMAGE_MIMES[image], maxBytes: IMAGE_MAX_BYTES };
    // ISO base media files start with an "ftyp" box at bytes 4-7.
    if (buffer.length >= 12 && buffer.toString('latin1', 4, 8) === 'ftyp') {
        return { type: 'video', ext: 'mp4', mime: 'video/mp4', maxBytes: VIDEO_MAX_BYTES };
    }
    return null;
};
