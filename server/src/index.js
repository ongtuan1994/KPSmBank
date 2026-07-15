import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Load server/.env (git-ignored) before importing modules that read process.env.
const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envPath)) {
  try { process.loadEnvFile(envPath); } catch (e) { console.warn('[env] failed to load .env:', e.message); }
}

const { createApp } = await import('./app.js');
const { initDb } = await import('./db.js');

const PORT = process.env.PORT || 4000;
const app = createApp();

await initDb();
console.log('[db] ready');
app.listen(PORT, () => console.log(`[server] KPS mBank API on http://localhost:${PORT}`));
