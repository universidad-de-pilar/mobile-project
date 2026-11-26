import { detectImageType, IMAGE_MAX_BYTES } from 'src/products/domain/product-image';

const bytes = (...b: number[]) => Buffer.concat([Buffer.from(b), Buffer.alloc(12)]);
const webp = () => Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 2, 3, 4]), Buffer.from('WEBPVP8 ')]);

describe('detectImageType', () => {
  it('debe reconocer JPEG, PNG y WebP por sus bytes', () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpg');
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png');
    expect(detectImageType(webp())).toBe('webp');
  });

  it('debe rechazar GIF, exe renombrado, RIFF que no es WebP y buffers cortos', () => {
    expect(detectImageType(Buffer.from('GIF89a......'))).toBeNull();
    expect(detectImageType(Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00'))).toBeNull();
    expect(detectImageType(Buffer.from('RIFF\x01\x02\x03\x04WAVEfmt '))).toBeNull();
    expect(detectImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });

  it('debe fijar el limite en exactamente 5 MB', () => {
    expect(IMAGE_MAX_BYTES).toBe(5_242_880);
  });
});
