// Danger: wipes the database file so it re-seeds from seed-data.js on next start.
import { rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'kps-mbank.db');

for (const suffix of ['', '-wal', '-shm']) {
  const p = DB_PATH + suffix;
  if (existsSync(p)) {
    rmSync(p);
    console.log('removed', p);
  }
}
console.log('Database reset. It will be re-seeded on next server start.');
