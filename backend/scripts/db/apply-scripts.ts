import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { dbSsl } from '../../src/db/db-ssl';
import { checksum, planScripts } from './plan-scripts';

const scriptsDir = join(__dirname, '../../../database/scripts');

// Created here (not in a script) so it exists before any script is evaluated.
const bootstrap = `
create table if not exists schema_versions (
  version varchar primary key,
  checksum char(64) not null,
  applied_at timestamptz not null default current_timestamp
);
comment on table schema_versions is 'SQL scripts already applied by db:apply, so each runs once';
comment on column schema_versions.version is 'Script file name without .sql; defines apply order';
comment on column schema_versions.checksum is 'sha256 of the applied file; detects edits to applied scripts';
`;

async function main() {
  const contents = new Map(
    readdirSync(scriptsDir)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => [f.slice(0, -4), readFileSync(join(scriptsDir, f), 'utf8')]),
  );
  const files = [...contents].map(([version, sql]) => ({
    version,
    checksum: checksum(sql),
  }));

  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: dbSsl(process.env.DB_CA_CERT),
  });
  await client.connect();

  try {
    await client.query(bootstrap);
    const { rows } = await client.query(
      'select version, checksum from schema_versions',
    );
    const pending = planScripts(files, rows);

    for (const version of pending) {
      try {
        await client.query('begin');
        await client.query(contents.get(version)!);
        await client.query(
          'insert into schema_versions (version, checksum) values ($1, $2)',
          [version, files.find((f) => f.version === version)!.checksum],
        );
        await client.query('commit');
      } catch (err) {
        await client.query('rollback');
        console.error(`script ${version} failed`);
        throw err;
      }
      console.log(`applied ${version}`);
    }
    console.log(`applied ${pending.length}, skipped ${files.length - pending.length}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
