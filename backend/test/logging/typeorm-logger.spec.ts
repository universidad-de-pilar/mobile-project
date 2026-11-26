import { AppLogger } from '../../src/logging/app-logger';
import { TypeOrmLogger } from '../../src/logging/typeorm-logger';

describe('TypeOrmLogger', () => {
  it('logs the query through the app logger without its parameters', () => {
    const lines: string[] = [];
    const logger = new AppLogger({
      mode: 'json',
      resource: { name: 's', version: '1', environment: 't', node: 'h' },
      write: (l) => lines.push(l),
    });
    new TypeOrmLogger(logger).logQuery('SELECT * FROM users WHERE email = $1', ['a@b.com', 'hunter2']);
    const e = JSON.parse(lines[0]);
    expect(e['log.logger']).toBe('TypeORM');
    expect(e.message).toBe('SELECT * FROM users WHERE email = $1');
    expect(lines[0]).not.toContain('hunter2');
  });
});
