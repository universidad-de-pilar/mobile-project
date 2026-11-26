import { NestExpressApplication } from '@nestjs/platform-express';

const notFound = (res: any) =>
  res.status(404).json({ statusCode: 404, message: 'File not found', error: 'Not Found', code: 'MEDIA_NOT_FOUND' });

// Decoded segments are checked so %2e%2e and %2f variants cannot escape the container.
const isSafePath = (path: string) => {
  try {
    const segments = decodeURIComponent(path).split(/[/\\]/).slice(1);
    return segments.length > 0 && segments.every((s) => s && s !== '.' && s !== '..');
  } catch {
    return false;
  }
};

// Express middleware runs before Nest routing, so TenantMiddleware and guards never see /media.
// With resolveUrl the files live in Cloudinary and /media redirects there; otherwise they are served from dir.
export const serveMedia = (app: NestExpressApplication, dir: string, resolveUrl?: (path: string) => string) => {
  if (resolveUrl) {
    app.use('/media', (req, res) =>
      isSafePath(req.path) ? res.redirect(302, resolveUrl(req.path)) : notFound(res),
    );
    return;
  }
  app.useStaticAssets(dir, {
    prefix: '/media',
    index: false,
    redirect: false,
    setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'),
  });
  // A missing file stops here with a plain 404 instead of falling through to TenantMiddleware.
  app.use('/media', (_req, res) => notFound(res));
};
