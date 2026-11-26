import type { Logger } from 'typeorm';
import { AppLogger } from './app-logger';

// Query parameters are never logged: they can carry passwords and tokens.
export class TypeOrmLogger implements Logger {
  constructor(private readonly logger: AppLogger) {}

  logQuery(query: string, _parameters?: unknown) { this.logger.write('DEBUG', 'TypeORM', query); }
  logQueryError(error: string | Error, query: string) {
    this.logger.write('ERROR', 'TypeORM', `query failed: ${query}`, { error });
  }
  logQuerySlow(time: number, query: string) {
    this.logger.write('WARN', 'TypeORM', `slow query: ${query}`, { events: { duration_ms: time } });
  }
  logSchemaBuild(message: string) { this.logger.write('INFO', 'TypeORM', message); }
  logMigration(message: string) { this.logger.write('INFO', 'TypeORM', message); }
  log(level: 'log' | 'info' | 'warn', message: any) {
    this.logger.write(level === 'warn' ? 'WARN' : 'INFO', 'TypeORM', String(message));
  }
}
