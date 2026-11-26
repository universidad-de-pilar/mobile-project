import { createHash } from 'node:crypto';

export interface ScriptRef {
  version: string;
  checksum: string;
}

// Normalize CRLF so Windows and Linux checkouts of the same script hash equally.
export const checksum = (content: string): string =>
  createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex');

export function planScripts(files: ScriptRef[], applied: ScriptRef[]): string[] {
  const byVersion = new Map(files.map((f) => [f.version, f.checksum]));
  const done = new Set<string>();

  for (const row of applied) {
    const current = byVersion.get(row.version);
    if (current === undefined) {
      throw new Error(`script ${row.version} was applied but its file is missing`);
    }
    if (current !== row.checksum) {
      throw new Error(`script ${row.version} was modified after being applied`);
    }
    done.add(row.version);
  }

  return files
    .map((f) => f.version)
    .filter((v) => !done.has(v))
    .sort();
}
