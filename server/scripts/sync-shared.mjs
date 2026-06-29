import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoShared = resolve(serverRoot, '../shared');
const localShared = resolve(serverRoot, 'shared');

function copyTsFiles(fromDir, toDir) {
  mkdirSync(toDir, { recursive: true });
  for (const name of readdirSync(fromDir)) {
    if (!name.endsWith('.ts')) continue;
    copyFileSync(resolve(fromDir, name), resolve(toDir, name));
  }
}

if (existsSync(repoShared)) {
  copyTsFiles(repoShared, localShared);
  console.log('[sync-shared] updated server/shared from repo shared/');
} else if (!existsSync(localShared)) {
  console.error('[sync-shared] missing server/shared — commit shared types or deploy from monorepo root');
  process.exit(1);
}
