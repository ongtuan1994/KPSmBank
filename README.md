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
Typecheck + production build pass. End-to-end (Playwright, headless): all 7 views render with
seeded data and **no console errors**; add (incl. creating a new cost center) → persists across
reload → edit → delete → limit change all work against the live server; Thai voucher renders
with correct baht-text.

## Known gaps / follow-ups
- **Auth**: none yet — the API is open on localhost. Add before any networked deployment.
- **Backups**: the SQLite file is the only copy. Add a periodic file backup or the JSON
  export/import escape hatch before relying on it for real records.
- **Departments**: can be added but not renamed/deleted (matches the prototype).
- **Concurrency**: last-write-wins; fine for the current single-user use.
- The original design files (`Mobile Banking Portal.dc.html`, `support.js`) are kept at the
  repo root as the reference spec.
