import { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AppLogger } from './app-logger';
import { ErrorCaptureFilter, requestLogging } from './request-logging';

export function setupLogging(app: INestApplication, logger: AppLogger) {
  app.use(requestLogging(logger));
  app.useGlobalFilters(new ErrorCaptureFilter(app.get(HttpAdapterHost).httpAdapter));
}
