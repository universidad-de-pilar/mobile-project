import { checksum, planScripts } from '../../scripts/db/plan-scripts';

describe('planScripts', () => {
  it('debe devolver todas las versiones en orden ascendente cuando no hay aplicadas', () => {
    const files = [
      { version: '003_c', checksum: 'c' },
      { version: '001_a', checksum: 'a' },
      { version: '002_b', checksum: 'b' },
    ];

    expect(planScripts(files, [])).toEqual(['001_a', '002_b', '003_c']);
  });

  it('debe devolver solo las pendientes cuando hay algunas aplicadas', () => {
    const files = [
      { version: '002_b', checksum: 'b' },
      { version: '001_a', checksum: 'a' },
      { version: '003_c', checksum: 'c' },
    ];
    const applied = [{ version: '001_a', checksum: 'a' }];

    expect(planScripts(files, applied)).toEqual(['002_b', '003_c']);
  });

  it('debe devolver [] cuando todas estan aplicadas', () => {
    const files = [{ version: '001_a', checksum: 'a' }];

    expect(planScripts(files, files)).toEqual([]);
  });

  it('debe fallar nombrando la version cuando el checksum cambio', () => {
    const files = [{ version: '001_a', checksum: 'nuevo' }];
    const applied = [{ version: '001_a', checksum: 'viejo' }];

    expect(() => planScripts(files, applied)).toThrow(
      'script 001_a was modified after being applied',
    );
  });

  it('debe fallar cuando una version aplicada ya no tiene archivo', () => {
    const applied = [{ version: '001_a', checksum: 'a' }];

    expect(() => planScripts([], applied)).toThrow('001_a');
  });

  it('debe calcular un checksum estable de 64 caracteres hex', () => {
    expect(checksum('select 1;')).toMatch(/^[0-9a-f]{64}$/);
    expect(checksum('select 1;')).toBe(checksum('select 1;'));
    expect(checksum('select 2;')).not.toBe(checksum('select 1;'));
  });

  it('debe calcular el mismo checksum con finales de linea CRLF y LF', () => {
    expect(checksum('select 1;\r\nselect 2;\r\n')).toBe(
      checksum('select 1;\nselect 2;\n'),
    );
  });
});
