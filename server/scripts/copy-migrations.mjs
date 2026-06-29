import { cpSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const serverRoot = resolve(import.meta.dirname, '..');
const src = resolve(serverRoot, 'migrations');
const dest = resolve(serverRoot, 'dist', 'migrations');

if (!existsSync(src)) {
  console.error('[copy-migrations] missing server/migrations');
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('[copy-migrations] copied migrations -> dist/migrations');
