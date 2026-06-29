import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './pg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveMigrationsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'migrations'),
    path.resolve(__dirname, '../../../migrations'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error(
    `[migrate] migrations folder not found (checked: ${candidates.join(', ')})`,
  );
}

export async function runMigrations(): Promise<void> {
  const migrationsDir = resolveMigrationsDir();
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const file of files) {
    const id = file;
    const applied = await query('SELECT 1 FROM schema_migrations WHERE id = $1', [id]);
    if (applied.rowCount && applied.rowCount > 0) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await query(sql);
    await query('INSERT INTO schema_migrations (id) VALUES ($1)', [id]);
    console.log(`[migrate] applied ${file}`);
  }
}
