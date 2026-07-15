import crypto from 'node:crypto';

// Credentials and secret come from the environment (see server/.env — git-ignored).
const USERNAME = process.env.AUTH_USERNAME || '';
const PASSWORD = process.env.AUTH_PASSWORD || '';
let SECRET = process.env.SESSION_SECRET || '';

if (!USERNAME || !PASSWORD) {
  console.warn('[auth] AUTH_USERNAME / AUTH_PASSWORD are not set — login will reject everyone. Create server/.env (copy .env.example).');
}
if (!SECRET) {
  SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('[auth] SESSION_SECRET not set — using an ephemeral secret; sessions will not survive a restart.');
}

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest();
function constantTimeEqual(a, b) {
  // hash to a fixed length so timingSafeEqual never sees mismatched lengths
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const hmac = (data) => crypto.createHmac('sha256', SECRET).update(data).digest();

/** Verify a username/password pair in constant time. */
export function checkCredentials(username, password) {
  if (!USERNAME || !PASSWORD) return false;
  // evaluate both to avoid short-circuit timing differences
  const okUser = constantTimeEqual(username ?? '', USERNAME);
  const okPass = constantTimeEqual(password ?? '', PASSWORD);
  return okUser && okPass;
}

/** Issue a signed session token: base64url(payload).base64url(hmac). */
export function issueToken(username) {
  const payload = b64url(JSON.stringify({ u: username, exp: Date.now() + TOKEN_TTL_MS }));
  const sig = b64url(hmac(payload));
  return `${payload}.${sig}`;
}

/** Validate a token; returns the username if valid, else null. */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = b64url(hmac(payload));
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;
    return data.u || null;
  } catch {
    return null;
  }
}

/** Express middleware: require a valid Bearer token. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  req.user = user;
  next();
}
