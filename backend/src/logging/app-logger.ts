import { LoggerService } from '@nestjs/common';
import { hostname } from 'node:os';
import { redact } from './redact';
import { requestStore } from './request-context';

export type Level = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export interface Resource { name: string; version: string; environment: string; node: string }
interface Options { mode?: 'json' | 'clf'; resource?: Resource; write?: (line: string) => void }
interface ErrorInfo { type: string; message: string; stack: string }
interface Extra { events?: Record<string, unknown>; error?: unknown }

const toErrorInfo = (e: unknown): ErrorInfo =>
  e instanceof Error
    ? { type: e.constructor.name, message: e.message, stack: e.stack ?? '' }
    : { type: '', message: typeof e === 'string' ? '' : String(e), stack: typeof e === 'string' ? e : '' };

const fmt = (v: unknown) => (typeof v === 'string' || (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v));

export class AppLogger implements LoggerService {
  private cfg?: { mode: 'json' | 'clf'; resource: Resource };

  constructor(private readonly opts: Options = {}) {}

  // Resolved on first use (not at import) so values loaded from .env are visible; fixed afterwards.
  private get config() {
    return (this.cfg ??= {
      mode: this.opts.mode ?? (process.env.LOG_MODE?.toLowerCase() === 'json' ? 'json' : 'clf'),
      resource: this.opts.resource ?? {
        name: process.env.SERVICE_NAME ?? 'mostrador-backend',
        version: process.env.SERVICE_VERSION ?? process.env.npm_package_version ?? '0.0.1',
        environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'production',
        node: process.env.HOSTNAME ?? hostname(),
      },
    });
  }

  write(level: Level, logger: string, message: string, extra: Extra = {}) {
    const { mode, resource } = this.config;
    const store = requestStore.getStore();
    const events = redact({
      request_id: store?.requestId ?? null,
      tenant_id: store?.tenantId ?? null,
      ...extra.events,
    }) as Record<string, unknown>;
    const err = extra.error === undefined ? undefined : toErrorInfo(extra.error);
    const timestamp = new Date().toISOString();
    const thread = `thread-${process.pid}`;

    const line =
      mode === 'json'
        ? JSON.stringify({
            timestamp,
            'log.level': level,
            'log.logger': logger,
            'log.origin.file.name': '',
            'log.origin.file.line': '',
            'log.origin.function': '',
            message,
            'error.type': err?.type ?? '',
            'error.message': err?.message ?? '',
            'error.stack_trace': err?.stack ?? '',
            'process.thread.name': thread,
            resource: {
              'service.name': resource.name,
              'service.version': resource.version,
              'service.environment': resource.environment,
              'service.node.name': resource.node,
            },
            events,
          })
        : [
            `${timestamp} ${level} [${logger}] "${message}" service=${resource.name} version=${resource.version}`,
            `env=${resource.environment} thread=${thread}`,
            ...Object.entries(events).map(([k, v]) => `${k}=${fmt(v)}`),
            ...(err ? [`error.type=${err.type} error.message=${JSON.stringify(err.message)}`] : []),
          ].join(' ') + (err?.stack ? `\n${err.stack}` : '');

    (this.opts.write ?? ((l) => process.stdout.write(l)))(line + '\n');
  }

  // Nest LoggerService: (message, ...optionalParams) where the last string is the context.
  private nest(level: Level, message: unknown, params: unknown[], withStack = false) {
    const last = params[params.length - 1];
    const context = typeof last === 'string' ? last : '';
    const stack = withStack && params.length > 1 && typeof params[0] === 'string' ? params[0] : undefined;
    if (message instanceof Error) return this.write(level, context, message.message, { error: message });
    const text = typeof message === 'string' ? message : JSON.stringify(redact(message));
    this.write(level, context, text, stack === undefined ? {} : { error: stack });
  }

  log(m: unknown, ...p: unknown[]) { this.nest('INFO', m, p); }
  error(m: unknown, ...p: unknown[]) { this.nest('ERROR', m, p, true); }
  warn(m: unknown, ...p: unknown[]) { this.nest('WARN', m, p); }
  debug(m: unknown, ...p: unknown[]) { this.nest('DEBUG', m, p); }
  verbose(m: unknown, ...p: unknown[]) { this.nest('TRACE', m, p); }
  fatal(m: unknown, ...p: unknown[]) { this.nest('FATAL', m, p); }
}

export const logger = new AppLogger();
