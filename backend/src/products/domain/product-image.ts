export type ImageType = 'jpg' | 'png' | 'webp';

export const IMAGE_MAX_BYTES = 5_242_880;

const startsWith = (buffer: Buffer, offset: number, bytes: number[]) =>
  bytes.every((byte, i) => buffer[offset + i] === byte);

export const detectImageType = (buffer: Buffer): ImageType | null => {
  if (startsWith(buffer, 0, [0xff, 0xd8, 0xff])) return 'jpg';
  if (startsWith(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  // "RIFF" at bytes 0-3 and "WEBP" at bytes 8-11
  if (startsWith(buffer, 0, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, 8, [0x57, 0x45, 0x42, 0x50])) return 'webp';
  return null;
};
