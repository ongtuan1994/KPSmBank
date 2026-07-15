// One-time seeder for the production (Turso) database. Run locally with the Turso
// credentials in the environment (or in server/.env):
//   npm run seed:turso
// Creates the schema and seeds from seed-data.js only if the DB is empty.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envPath)) {
  try { process.loadEnvFile(envPath); } catch (e) { console.warn('[env]', e.message); }
}

if (!process.env.TURSO_DATABASE_URL) {
  console.error('Refusing to run: TURSO_DATABASE_URL is not set. Point this at your Turso DB (and set TURSO_AUTH_TOKEN).');
  process.exit(1);
}

const { initDb, getFullDb } = await import('./db.js');

console.log('Seeding', process.env.TURSO_DATABASE_URL.replace(/\?.*/, ''), '…');
await initDb();
const db = await getFullDb();
console.log('Done. Counts:', {
  opening: db.opening,
  departments: db.departments.length,
  costCenters: db.costCenters.length,
  payees: db.payees.length,
  txns: db.txns.length,
});
process.exit(0);
