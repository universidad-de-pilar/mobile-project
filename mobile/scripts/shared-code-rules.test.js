const { isPlatformFile, measure } = require('./shared-code-rules');

describe('isPlatformFile', () => {
  it.each(['a/player-stage.web.tsx', 'b.android.ts', 'c.ios.tsx', 'd.native.ts'])('%s is platform specific', (p) => {
    expect(isPlatformFile(p)).toBe(true);
  });

  it.each(['a/player-stage.tsx', 'web.ts', 'src/web/index.ts', 'webhook.ts'])('%s is shared', (p) => {
    expect(isPlatformFile(p)).toBe(false);
  });
});

describe('measure', () => {
  it('splits lines and computes the shared percentage', () => {
    const r = measure([
      { path: 'a.tsx', lines: 90 },
      { path: 'b.web.tsx', lines: 10 },
    ]);
    expect(r).toEqual({ sharedLines: 90, platformLines: 10, sharedPct: 90 });
  });

  it('is 100% when there are no files', () => {
    expect(measure([]).sharedPct).toBe(100);
  });
});
