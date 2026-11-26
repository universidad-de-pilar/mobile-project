import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { AppLogger } from './app-logger';
import { RequestStore, requestStore } from './request-context';

const VALID_ID = /^[\w.-]{1,128}$/;

// One wide event per request, emitted when the response ends. Never logs bodies, headers or query strings.
export function requestLogging(logger: AppLogger): RequestHandler {
  return (req: any, res, next) => {
    const start = Date.now();
    const header = req.headers['x-request-id'];
    const requestId = typeof header === 'string' && VALID_ID.test(header) ? header : randomUUID();
    res.setHeader('x-request-id', requestId);
    // TenantMiddleware runs later, so the tenant is read lazily.
    const store: RequestStore = { requestId, get tenantId() { return req.tenant?.tenant_id ?? null; } };

    let done = false;
    const emit = () => {
      if (done) return;
      done = true;
      // On client abort only 'close' fires and statusCode is still the default 200.
      const status = res.writableFinished ? res.statusCode : 499;
      const path = req.originalUrl.split('?')[0];
      logger.write(status >= 500 ? 'ERROR' : 'INFO', 'HttpRequest', `${req.method} ${path} ${status} ${res.statusMessage ?? ''}`.trim(), {
        events: {
          request_id: requestId,
          tenant_id: store.tenantId,
          user_id: req.user?.sub,
          method: req.method,
          path,
          status_code: status,
          duration_ms: Date.now() - start,
          outcome: status < 400 ? 'success' : 'error',
        },
        error: req.logError,
      });
    };
    res.once('finish', emit);
    res.once('close', emit);
    requestStore.run(store, next);
  };
}

// http-errors objects (body-parser 413/415...) look like {status|statusCode, message}; Nest answers them with that status.
const httpErrorStatus = (e: any): number | undefined => {
  const s = e?.statusCode ?? e?.status;
  return typeof e?.message === 'string' && Number.isInteger(s) && s >= 400 && s < 600 ? s : undefined;
};

// Keeps 5xx failures on the request for the wide event; replies with Nest's default bodies, without its extra log line.
@Catch()
export class ErrorCaptureFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest();
    if (!(exception instanceof HttpException)) {
      const status = httpErrorStatus(exception);
      if (status === undefined || status >= 500) req.logError = exception;
      exception = status === undefined
        ? new HttpException({ statusCode: 500, message: 'Internal server error' }, 500)
        : new HttpException({ statusCode: status, message: (exception as Error).message }, status);
    } else if (exception.getStatus() >= 500) {
      req.logError = exception;
    }
    super.catch(exception, host);
  }
}
