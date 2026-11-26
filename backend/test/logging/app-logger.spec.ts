import { AppLogger } from '../../src/logging/app-logger';
import { requestStore } from '../../src/logging/request-context';

const resource = { name: 'svc', version: '1.2.3', environment: 'test', node: 'host-1' };

function setup(mode: 'json' | 'clf') {
  const lines: string[] = [];
  const logger = new AppLogger({ mode, resource, write: (l) => lines.push(l) });
  return { lines, logger };
}

describe('AppLogger json mode', () => {
  it('emits one NDJSON line following the canonical schema', () => {
    const { lines, logger } = setup('json');
    logger.write('INFO', 'Checkout', 'POST /orders 201 Created', { events: { status_code: 201 } });
    expect(lines).toHaveLength(1);
    expect(lines[0].endsWith('\n')).toBe(true);
    const e = JSON.parse(lines[0]);
    expect(e.timestamp).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    expect(e['log.level']).toBe('INFO');
    expect(e['log.logger']).toBe('Checkout');
    expect(e.message).toBe('POST /orders 201 Created');
    expect(e['error.type']).toBe('');
    expect(e['process.thread.name']).toBe(`thread-${process.pid}`);
    expect(e.resource).toEqual({
      'service.name': 'svc',
      'service.version': '1.2.3',
      'service.environment': 'test',
      'service.node.name': 'host-1',
    });
    expect(e.events).toMatchObject({ status_code: 201, request_id: null, tenant_id: null });
  });

  it('fills error fields and redacts sensitive event keys', () => {
    const { lines, logger } = setup('json');
    logger.write('ERROR', 'X', 'boom', { error: new TypeError('bad'), events: { password: 'p' } });
    const e = JSON.parse(lines[0]);
    expect(e['error.type']).toBe('TypeError');
    expect(e['error.message']).toBe('bad');
    expect(e['error.stack_trace']).toContain('TypeError: bad');
    expect(e.events.password).toBe('[REDACTED]');
  });

  it('adds request_id and tenant_id from the request context', () => {
    const { lines, logger } = setup('json');
    requestStore.run({ requestId: 'req-1', tenantId: 'ten-1' }, () => logger.write('INFO', 'X', 'hi'));
    expect(JSON.parse(lines[0]).events).toMatchObject({ request_id: 'req-1', tenant_id: 'ten-1' });
  });

  it('maps Nest levels and context', () => {
    const { lines, logger } = setup('json');
    logger.warn('w', 'Ctx');
    logger.error('e', 'stack-text', 'Ctx');
    logger.fatal('f', 'Ctx');
    const [w, e, f] = lines.map((l) => JSON.parse(l));
    expect([w['log.level'], e['log.level'], f['log.level']]).toEqual(['WARN', 'ERROR', 'FATAL']);
    expect(w['log.logger']).toBe('Ctx');
    expect(e['error.stack_trace']).toBe('stack-text');
  });
});

describe('AppLogger clf mode', () => {
  it('emits a single human line with flat events and error suffix', () => {
    const { lines, logger } = setup('clf');
    logger.write('ERROR', 'Checkout', 'POST /x 500 Internal Server Error', {
      events: { status_code: 500 },
      error: new Error('oops'),
    });
    const [head, ...stack] = lines[0].trimEnd().split('\n');
    expect(head).toMatch(
      /^\d{4}-\d\d-\d\dT[\d:.]+Z ERROR \[Checkout\] "POST \/x 500 Internal Server Error" service=svc version=1\.2\.3 env=test thread=thread-\d+ /,
    );
    expect(head).toContain('status_code=500');
    expect(head).toContain('request_id=null');
    expect(head).toContain('error.type=Error error.message="oops"');
    expect(stack.join('\n')).toContain('Error: oops');
  });
});
