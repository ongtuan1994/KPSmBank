# แพปลา KPS · Mobile Banking Portal (KPSmBank)

A daily bank-transfer ledger for the KPS fish dock (แพปลา KPS) — records daily transfers
out/in on Bualuang mBanking, tracks a per-day transfer ceiling and a running account
balance, and produces Thai payment vouchers (ใบสำคัญจ่าย) and daily/monthly/yearly reports.

This is the production implementation of the design prototype `Mobile Banking Portal.dc.html`.
Every calculation (running balance, voucher numbering, Thai baht-text, the monthly
department roll-up, the yearly matrix) is ported **verbatim** from that prototype's logic.

## Architecture

| Layer | Tech | Notes |
|-------|------|-------|
| Client | Vite + React 18 + TypeScript | `client/` — SPA, port **5199** |
| Server | Node + Express | `server/` — REST API, port **4000** |
| Database | SQLite via Node's built-in `node:sqlite` | `server/data/kps-mbank.db` (git-ignored) |

The client loads the whole dataset once (`GET /api/db`) and mirrors it in React state — the
same shape the prototype held in `localStorage`. Every mutation hits a REST endpoint and then
re-fetches, so all the derived views stay a pure function of the data. The data is small
(≈700 payees, ≈400 cost centers, ≈140 transactions/month).

### Data model
- `settings` — `opening` balance, `dailyLimit`
- `departments` — group names (e.g. กรรมการ, โรงงานมะริด)
- `cost_centers` — `name` (ชื่อบัญชี) + `dept`
- `payees` — master data: shop, payTo, bank, acct, type, detail, line, status
- `txns` — `date, voucher, cc, detail, payTo, bank, acct, recv, pay, note` (+ `ord` for stable intra-day order)

## Getting started

```bash
npm run install:all     # install root + server + client deps
npm run dev             # starts server (:4000) and client (:5199) together
```

Open http://localhost:5199. On first run the server seeds the database from `seed-data.js`
(opening ฿3,587,191.60 · 695 payees · 402 cost centers · 6 departments · 137 May-2026 txns).

## Deployment (Vercel + Turso)

**Live:** https://kps-mbank.vercel.app

The app runs entirely on Vercel: the Vite build is served as static files and the Express API
runs as a serverless function (`api/index.js`). Because serverless has no persistent disk, the
database is **Turso** (libSQL, SQLite-compatible) instead of a local file.

Config lives in `vercel.json` (build the client to `client/dist`, route `/api/*` to the
function, bundle `seed-data.js`). Required Vercel environment variables (Production + Preview):

| Variable | Purpose |
|----------|---------|
| `TURSO_DATABASE_URL` | Turso database URL (`libsql://…`) |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `AUTH_USERNAME`, `AUTH_PASSWORD` | login credentials |
| `SESSION_SECRET` | signs session tokens |

Redeploy after code changes:

```bash
vercel --prod        # deploy current code to production
vercel deploy        # preview deploy (test before promoting)
```

Seed the production database once (already done for the current DB):

```bash
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run seed:turso
```

To change the login password in production: `vercel env rm AUTH_PASSWORD production`, then
`vercel env add AUTH_PASSWORD production` with the new value, and redeploy (`vercel --prod`).

## Authentication

The app is gated by a login screen. The whole API (except `/api/login` and `/api/health`)
requires a valid Bearer token issued at login.

- Credentials live **only** in `server/.env` (git-ignored) — never committed:
  ```
  AUTH_USERNAME=...
  AUTH_PASSWORD=...
  SESSION_SECRET=<long random string>   # keeps sessions valid across restarts
  ```
  Copy `server/.env.example` to `server/.env` and fill it in (a working `.env` is already
  present on the original machine).
- On login the server verifies the credentials in constant time and returns an HMAC-signed
  token (30-day expiry). The client stores it in `localStorage` and sends it as
  `Authorization: Bearer <token>`. Any `401` drops the session back to the login screen.
- **To change the password**, edit `server/AUTH_PASSWORD` in `server/.env` and restart the
  server. No code change needed.

Other scripts:
- `npm run build` — production build of the client (`client/dist`)
- `npm run seed:reset` — wipe the DB so it re-seeds from `seed-data.js` on next start

## API

`GET /api/db` · `PUT /api/settings`
`POST /api/departments`
`POST|PATCH|DELETE /api/cost-centers[/:id]`
`POST|PUT|DELETE /api/payees[/:id]` · `POST /api/payees/:id/toggle`
`POST|PUT|DELETE /api/txns[/:id]`

Voucher numbers (`M{YY}-{MM}-{NNN}`, Thai year) are generated client-side and enforced unique
server-side (409 on clash).

## Decisions made
- **SQLite (`node:sqlite`)** over Postgres/better-sqlite3: right-sized for a single-business
  ledger and needs no native compilation on Windows (Node 24 built-in). The schema is plain
  SQL, so moving to Postgres later is a contained change (swap the driver + adjust a few types).
- **Load-whole-DB + re-fetch** over granular caching: keeps every computed view identical to
  the verified prototype logic; the dataset is far too small for this to matter.
- Seed transactions carry blank `bank`/`acct`; the voucher and analytics views back-fill those
  from the payee master by matching `payTo`/`shop` (ported from the prototype).

## Verified
Typecheck + production build pass. End-to-end (Playwright, headless):
- **Data/UI**: all 7 views render with seeded data and **no console errors**; add (incl.
  creating a new cost center) → persists across reload → edit → delete → limit change all work
  against the live server; Thai voucher renders with correct baht-text.
- **Auth**: unauthenticated visit shows the login screen; wrong password is rejected; correct
  credentials load the app and store a token; the session survives reload; logout clears it and
  returns to login; an invalid/expired token is rejected. The API returns `401` without a token.

## Known gaps / follow-ups
- **Password strength**: the default password is short/numeric. For a public-facing or
  multi-user setup, use a longer password (change `AUTH_PASSWORD` in `server/.env`) and
  consider per-user accounts + password hashing at rest.
- **Transport**: tokens travel in plain HTTP on localhost. Put the app behind HTTPS before any
  networked deployment.
- **Backups**: the SQLite file is the only copy. Add a periodic file backup or a JSON
  export/import escape hatch before relying on it for real records.
- **Departments**: can be added but not renamed/deleted (matches the prototype).
- **Concurrency**: last-write-wins; fine for the current single-user use.
- The original design files (`Mobile Banking Portal.dc.html`, `support.js`) are kept at the
  repo root as the reference spec.
