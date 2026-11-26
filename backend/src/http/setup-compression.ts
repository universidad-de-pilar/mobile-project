import { INestApplication } from '@nestjs/common';
import compression from 'compression';

// Register after setupLogging so the wide event still covers the compressed response.
export function setupCompression(app: INestApplication) {
  app.use(compression());
}
