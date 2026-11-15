import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { serveMedia } from './media/serve-media';
import { cloudinaryEnabled, cloudinaryUrl } from './media/cloudinary-media';
import { uploadsDir } from './media/uploads-dir';
import { logger } from './logging/app-logger';
import { setupLogging } from './logging/setup-logging';
import { setupCompression } from './http/setup-compression';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger });
  setupLogging(app, logger);
  setupCompression(app);
  serveMedia(app, uploadsDir(), cloudinaryEnabled() ? cloudinaryUrl : undefined);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )

  app.enableCors({
    origin: [
      'http://localhost:8081',
      /^https?:\/\/[a-z0-9-]+\.localhost(:\d+)?$/,
      /^https:\/\/[a-z0-9-]+\.mostrador\.io$/,
      // Orígenes extra por entorno (p. ej. el sitio web desplegado), separados por comas
      ...(process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? []),
    ],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Tenant-Slug', 'If-None-Match', 'X-Request-Id'],
    exposedHeaders: ['ETag', 'X-Request-Id'],
  });

  await app.listen(process.env.PORT ?? 3000);
};

bootstrap();

