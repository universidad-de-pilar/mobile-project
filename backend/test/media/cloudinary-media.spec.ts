import { v2 as cloudinary } from 'cloudinary';
import { cloudinaryEnabled, cloudinaryUrl, removeMedia, uploadMedia } from 'src/media/cloudinary-media';

jest.mock('cloudinary');

const uploader = cloudinary.uploader as jest.Mocked<typeof cloudinary.uploader>;

describe('cloudinary media', () => {
  const env = process.env.CLOUDINARY_URL;
  afterEach(() => {
    process.env.CLOUDINARY_URL = env;
    if (env === undefined) delete process.env.CLOUDINARY_URL;
  });
  beforeEach(() => jest.clearAllMocks());

  it('cloudinaryEnabled depende solo de CLOUDINARY_URL', () => {
    delete process.env.CLOUDINARY_URL;
    expect(cloudinaryEnabled()).toBe(false);
    process.env.CLOUDINARY_URL = 'cloudinary://k:s@demo';
    expect(cloudinaryEnabled()).toBe(true);
  });

  it('cloudinaryUrl usa image sin extension en el public_id para imagenes', () => {
    (cloudinary.url as jest.Mock).mockReturnValue('https://res/x.png');

    expect(cloudinaryUrl('/t1/products/a.png')).toBe('https://res/x.png');
    expect(cloudinary.url).toHaveBeenCalledWith('mostrador/t1/products/a',{ resource_type: 'image', format: 'png', secure: true });
  });

  it('cloudinaryUrl usa video para mp4', () => {
    cloudinaryUrl('/t1/content/a.mp4');
    expect(cloudinary.url).toHaveBeenCalledWith('mostrador/t1/content/a',{ resource_type: 'video', format: 'mp4', secure: true });
  });

  it('uploadMedia sube el buffer con public_id, resource_type y sin sobrescribir', async () => {
    const end = jest.fn();
    (uploader.upload_stream as jest.Mock).mockImplementation((_opts, cb) => ({ end: (b: Buffer) => (end(b), cb(undefined, {})) }));
    const bytes = Buffer.from('x');

    await uploadMedia('t1/content/a.mp4', bytes);

    expect(uploader.upload_stream).toHaveBeenCalledWith(
      { public_id: 'mostrador/t1/content/a', resource_type: 'video', overwrite: false },
      expect.any(Function),
    );
    expect(end).toHaveBeenCalledWith(bytes);
  });

  it('uploadMedia rechaza si Cloudinary devuelve error', async () => {
    (uploader.upload_stream as jest.Mock).mockImplementation((_o, cb) => ({ end: () => cb(new Error('boom')) }));
    await expect(uploadMedia('t1/products/a.png', Buffer.alloc(1))).rejects.toThrow('boom');
  });

  it('relee CLOUDINARY_URL en el primer uso porque el SDK la cachea al importarse', () => {
    cloudinaryUrl('/t1/products/a.png');
    expect(cloudinary.config).toHaveBeenCalledWith(true);
  });

  it('removeMedia destruye con resource_type e invalidate', async () => {
    (uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

    await removeMedia('t1/content/a.mp4');

    expect(uploader.destroy).toHaveBeenCalledWith('mostrador/t1/content/a',{ resource_type: 'video', invalidate: true });
  });
});
