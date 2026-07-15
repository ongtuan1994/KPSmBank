// Vercel serverless entry. Env vars (TURSO_*, AUTH_*, SESSION_SECRET) come from the
// Vercel project settings. Schema + seed run lazily on the first authenticated request
// (see the initDb middleware in server/src/app.js).
import { createApp } from '../server/src/app.js';

export default createApp();
