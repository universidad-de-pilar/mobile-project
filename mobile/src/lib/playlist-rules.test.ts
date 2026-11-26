import {
  activeItems,
  advance,
  clampIndex,
  initialPlayerState,
  itemTimeoutMs,
  nextIndex,
  parseCachedPlaylist,
  parsePlaylist,
  pollOutcome,
  qrLabel,
  receivePlaylist,
  serializePlaylist,
  type Playlist,
} from '@/lib/playlist-rules';

const item = (id: string, type: 'image' | 'video' = 'image', duration = 10) => ({
  media_id: id,
  type,
  url: `/media/${id}`,
  duration_seconds: duration,
});

const playlist = (version: string, ids: string[]): Playlist => ({
  version,
  poll_interval_seconds: 30,
  store: { name: 'Palermo', slug: 'palermo' },
  qr_url: 'https://local1.mostrador.io/palermo?src=abc',
  default: { items: ids.map((id) => item(id)) },
  slots: [],
});

describe('nextIndex / clampIndex', () => {
  it('da la vuelta al llegar al final y tolera listas vacías', () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
    expect(nextIndex(0, 1)).toBe(0);
    expect(nextIndex(5, 0)).toBe(0);
  });

  it('acota el índice cuando la lista se achica', () => {
    expect(clampIndex(4, 2)).toBe(1);
    expect(clampIndex(-1, 2)).toBe(0);
    expect(clampIndex(1, 2)).toBe(1);
    expect(clampIndex(3, 0)).toBe(0);
  });
});

describe('receivePlaylist / advance', () => {
  it('la primera playlist se aplica al instante', () => {
    const s = receivePlaylist(initialPlayerState(null), playlist('v1', ['a', 'b']));
    expect(s.current?.version).toBe('v1');
    expect(s.pending).toBeNull();
  });

  it('una playlist nueva espera al próximo cambio sin interrumpir el elemento actual', () => {
    let s = receivePlaylist(initialPlayerState(null), playlist('v1', ['a', 'b', 'c']));
    s = receivePlaylist(s, playlist('v2', ['x', 'y']));
    expect(s.current?.version).toBe('v1');
    expect(s.pending?.version).toBe('v2');
    expect(s.index).toBe(0);

    s = advance(s);
    expect(s.current?.version).toBe('v2');
    expect(s.pending).toBeNull();
    expect(s.index).toBe(0);
  });

  it('con la misma versión descarta lo pendiente', () => {
    let s = receivePlaylist(initialPlayerState(null), playlist('v1', ['a', 'b']));
    s = receivePlaylist(s, playlist('v2', ['x']));
    s = receivePlaylist(s, playlist('v1', ['a', 'b']));
    expect(s.pending).toBeNull();
  });

  it('si la lista se achica, el índice da la vuelta y nunca queda fuera de rango', () => {
    let s = receivePlaylist(initialPlayerState(null), playlist('v1', ['a', 'b', 'c', 'd']));
    s = { ...s, index: 3 };
    s = receivePlaylist(s, playlist('v2', ['x', 'y']));
    s = advance(s);
    expect(s.index).toBe(0);
    expect(s.items).toHaveLength(2);
  });

  it('una lista sin elementos se reemplaza al instante porque no hay nada que interrumpir', () => {
    let s = receivePlaylist(initialPlayerState(null), playlist('v1', []));
    s = receivePlaylist(s, playlist('v2', ['a']));
    expect(s.current?.version).toBe('v2');
    expect(s.index).toBe(0);
  });

  it('un solo elemento sigue en bucle y cambia el ciclo para remontar', () => {
    let s = receivePlaylist(initialPlayerState(null), playlist('v1', ['a']));
    const first = s.cycle;
    s = advance(s);
    expect(s.index).toBe(0);
    expect(s.cycle).toBe(first + 1);
  });

  it('avanzar sin playlist no hace nada', () => {
    const s = initialPlayerState(null);
    expect(advance(s)).toBe(s);
  });
});

describe('pollOutcome', () => {
  const p = { ...playlist('v2', ['a']), poll_interval_seconds: 20 };

  it('200 aplica y reprograma con el intervalo de la playlist', () => {
    expect(pollOutcome({ status: 200, playlist: p }, 30)).toEqual({
      kind: 'apply',
      playlist: p,
      delayMs: 20000,
    });
  });

  it('304 mantiene y espera el intervalo vigente', () => {
    expect(pollOutcome({ status: 304 }, 30)).toEqual({ kind: 'keep', delayMs: 30000 });
  });

  it('404 es token no válido y no reprograma', () => {
    expect(pollOutcome({ status: 404 }, 30)).toEqual({ kind: 'invalid' });
  });

  it('falla de red o 5xx reintenta en el próximo ciclo', () => {
    expect(pollOutcome({ status: 'error' }, 30)).toEqual({ kind: 'retry', delayMs: 30000 });
  });
});

describe('caché de playlist', () => {
  it('serializa y vuelve a leer lo mismo', () => {
    const p = playlist('v1', ['a', 'b']);
    expect(parseCachedPlaylist(serializePlaylist(p))).toEqual(p);
  });

  it.each([
    ['nulo', null],
    ['vacío', ''],
    ['no JSON', '{no'],
    ['sin slots', JSON.stringify({ ...playlist('v', ['a']), slots: undefined })],
    ['item inválido', JSON.stringify({ ...playlist('v', ['a']), default: { items: [{ media_id: 'a', type: 'gif' }] } })],
    ['franja inválida', JSON.stringify({ ...playlist('v', ['a']), slots: [{ days: 'x', start: '08:00', end: '09:00', items: [] }] })],
    ['sin qr_url', JSON.stringify({ ...playlist('v', ['a']), qr_url: undefined })],
    ['duración cero', JSON.stringify({ ...playlist('v', []), default: { items: [item('a', 'image', 0)] } })],
  ])('tolera datos corruptos: %s', (_name, raw) => {
    expect(parseCachedPlaylist(raw as string | null)).toBeNull();
  });

  it('parsePlaylist acepta el cuerpo del API y rechaza lo que no es objeto', () => {
    expect(parsePlaylist(playlist('v1', ['a']))?.version).toBe('v1');
    expect(parsePlaylist('texto')).toBeNull();
  });
});

describe('itemTimeoutMs', () => {
  it('imagen dura lo indicado y el video suma una gracia para que gane ended', () => {
    expect(itemTimeoutMs(item('a', 'image', 10))).toBe(10000);
    expect(itemTimeoutMs(item('b', 'video', 42))).toBeGreaterThan(42000);
  });
});

describe('qrLabel', () => {
  it('muestra host y ruta sin query', () => {
    expect(qrLabel('https://local1.mostrador.io/palermo?src=abc')).toBe('local1.mostrador.io/palermo');
    expect(qrLabel('http://local1.localhost:8081/palermo?src=abc')).toBe('local1.localhost:8081/palermo');
  });

  it('con una URL inválida devuelve el texto tal cual', () => {
    expect(qrLabel('no es url')).toBe('no es url');
  });
});

describe('activeItems', () => {
  // 2026-11-02 is a Monday and 2026-11-08 a Sunday (JS getDay: Sunday = 0).
  const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m);
  const MON = at(2, 9);
  const withSlots = (slots: Playlist['slots'], def: string[] | null = ['d']): Playlist => ({
    ...playlist('v', []),
    default: def ? { items: def.map((id) => item(id)) } : null,
    slots,
  });
  const slot = (days: number, start: string, end: string, ids: string[]) => ({
    days,
    start,
    end,
    items: ids.map((id) => item(id)),
  });
  const ids = (p: Playlist, now: Date) => activeItems(p, now).map((i) => i.media_id);

  it('dentro de la franja usa sus items', () => {
    expect(ids(withSlots([slot(1, '08:00', '12:00', ['s'])]), MON)).toEqual(['s']);
  });

  it('el inicio es inclusivo y el fin exclusivo', () => {
    const p = withSlots([slot(1, '08:00', '12:00', ['s'])]);
    expect(ids(p, at(2, 8, 0))).toEqual(['s']);
    expect(ids(p, at(2, 11, 59))).toEqual(['s']);
    expect(ids(p, at(2, 12, 0))).toEqual(['d']);
    expect(ids(p, at(2, 7, 59))).toEqual(['d']);
  });

  it('franjas contiguas: a las 12:00 manda la segunda', () => {
    const p = withSlots([slot(1, '08:00', '12:00', ['a']), slot(1, '12:00', '14:00', ['b'])]);
    expect(ids(p, at(2, 12, 0))).toEqual(['b']);
  });

  it('convierte el día: lunes=1 y domingo=64', () => {
    const p = withSlots([slot(64, '00:00', '23:59', ['dom'])]);
    expect(ids(p, at(8, 10))).toEqual(['dom']);
    expect(ids(p, at(2, 10))).toEqual(['d']);
    const lun = withSlots([slot(1, '00:00', '23:59', ['lun'])]);
    expect(ids(lun, at(2, 10))).toEqual(['lun']);
    expect(ids(lun, at(8, 10))).toEqual(['d']);
  });

  it('una máscara con varios días aplica a cualquiera de ellos', () => {
    const p = withSlots([slot(31, '08:00', '12:00', ['sem'])]);
    expect(ids(p, at(6, 9))).toEqual(['sem']); // Friday
    expect(ids(p, at(7, 9))).toEqual(['d']); // Saturday
  });

  it('una franja activa sin items cae a la playlist por defecto', () => {
    expect(ids(withSlots([slot(1, '08:00', '12:00', [])]), MON)).toEqual(['d']);
  });

  it('sin franja activa y sin por defecto no hay nada', () => {
    expect(activeItems(withSlots([slot(1, '08:00', '12:00', ['s'])], null), at(2, 13))).toEqual([]);
    expect(activeItems(withSlots([], null), MON)).toEqual([]);
  });
});
