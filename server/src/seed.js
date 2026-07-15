import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// seed-data.js lives at the repo root and does `window.MBSEED = {...}`
const SEED_PATH = join(__dirname, '..', '..', 'seed-data.js');

export function loadSeed() {
  const code = readFileSync(SEED_PATH, 'utf8');
  const win = {};
  // eslint-disable-next-line no-new-func
  new Function('window', code)(win);
  return win.MBSEED || { opening: 0, payees: [], costCenters: [], departments: [], txns: [] };
}
