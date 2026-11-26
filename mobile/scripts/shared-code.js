// Usage: node scripts/shared-code.js [minPct]  (default 90, or SHARED_CODE_MIN env)
const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { measure } = require('./shared-code-rules');

const SRC = join(__dirname, '..', 'src');
const min = Number(process.argv[2] ?? process.env.SHARED_CODE_MIN ?? 90);

const files = readdirSync(SRC, { recursive: true })
  .filter((p) => /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p))
  .map((p) => ({
    path: p.replaceAll('\\', '/'),
    lines: readFileSync(join(SRC, p), 'utf8').split('\n').filter((l) => l.trim()).length,
  }));

const result = measure(files);
console.log(JSON.stringify(result));
if (result.sharedPct < min) {
  console.error(`sharedPct ${result.sharedPct} < ${min}`);
  process.exit(1);
}
