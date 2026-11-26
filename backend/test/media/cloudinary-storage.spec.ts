import { UnprocessableEntityException } from '@nestjs/common';
import sharp from 'sharp';
import { CloudinaryContentStorage } from 'src/content/infraestructure/cloudinary-content-storage';
import { CloudinaryImageStorage } from 'src/products/infraestructure/cloudinary-image-storage';
import { removeMedia, uploadMedia } from 'src/media/cloudinary-media';

jest.mock('src/media/cloudinary-media');

describe('Cloudinary storage adapters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (uploadMedia as jest.Mock).mockResolvedValue(undefined);
    (removeMedia as jest.Mock).mockResolvedValue(undefined);
  });

  describe('CloudinaryImageStorage', () => {
    const solid = (width: number) =>
      sharp({ create: { width, height: 100, channels: 3, background: '#ff0000' } }).png().toBuffer();

    it('debe subir la imagen reducida a 1280 px bajo <tenant>/products/<uuid>.<ext>', async () => {
      const imagePath = await new CloudinaryImageStorage().save('t1', await solid(4000), 'png');

      expect(imagePath).toMatch(/^t1\/products\/[0-9a-f-]{36}\.png$/);
      const [path, data] = (uploadMedia as jest.Mock).mock.calls[0];
      expect(path).toBe(imagePath);
      expect((await sharp(data).metadata()).width).toBeLessThanOrEqual(1280);
    });

    it('debe fallar con MEDIA_UNREADABLE sin subir nada si no se puede decodificar', async () => {
      const corrupt = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
      const error = await new CloudinaryImageStorage().save('t1', corrupt, 'png').catch((e) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(uploadMedia).not.toHaveBeenCalled();
    });

    it('remove debe borrar y tragarse los errores', async () => {
      await new CloudinaryImageStorage().remove('t1/products/a.png');
      expect(removeMedia).toHaveBeenCalledWith('t1/products/a.png');

      (removeMedia as jest.Mock).mockRejectedValue(new Error('down'));
      await expect(new CloudinaryImageStorage().remove('t1/products/a.png')).resolves.toBeUndefined();
    });
  });

  describe('CloudinaryContentStorage', () => {
    it('debe subir los bytes intactos bajo <tenant>/content/<uuid>.<ext>', async () => {
      const bytes = Buffer.from('video-bytes');
      const filePath = await new CloudinaryContentStorage().save('t1', bytes, 'mp4');

      expect(filePath).toMatch(/^t1\/content\/[0-9a-f-]{36}\.mp4$/);
      expect(uploadMedia).toHaveBeenCalledWith(filePath, bytes);
    });

    it('remove debe borrar y tragarse los errores', async () => {
      await new CloudinaryContentStorage().remove('t1/content/a.mp4');
      expect(removeMedia).toHaveBeenCalledWith('t1/content/a.mp4');

      (removeMedia as jest.Mock).mockRejectedValue(new Error('down'));
      await expect(new CloudinaryContentStorage().remove('t1/content/a.mp4')).resolves.toBeUndefined();
    });
  });
});
