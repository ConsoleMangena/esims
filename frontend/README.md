# ESIMS Frontend (React + Vite)

This is the ESIMS web UI powering survey submissions and blockchain anchoring on a private Ethereum chain.

- React 19 + TypeScript
- Tailwind CSS v4
- Authenticated dashboards for Surveyor, Manager, Client, and Admin

## Key features
- Surveyor: upload file, auto SHA‑256, clean validation.
- Manager: approve/reject, record on chain, anchor full file (raw chunks), chunk listing and per‑chunk download.
- Verify Original File: compare checksum and verify raw chunks with progress bars; drag‑and‑drop for files.
- Transactions Log: grouped by survey with chunk groups (0–99, 100–199…) and size hints; recovery workflow.
- Admin Dashboard: API health/latency, recent chain activity, KPIs.
- Global toast notifications and disabled buttons while pending.

## Getting started
```
npm install
npm run dev
# or
npm run build && npm run preview
```

Optional environment override (defaults to window origin + `/api/`):
```
VITE_API_BASE=http://127.0.0.1:8000/api/
VITE_CONTRACT_ADDRESS=0x...
VITE_ETH_CHAIN_ID=31337
```

## Pages
- Surveyor
  - `/surveyor` (dashboard)
  - `/surveyor/submit`
  - `/surveyor/submissions`
  - `/surveyor/profile`
- Manager
  - `/manager` (dashboard)
  - `/manager/verification` (approve/reject, record/anchor)
  - `/manager/verify-file` (verify original)
  - `/manager/transactions` (tx log, chunk explorer, recovery)
  - `/manager/help`
  - `/manager/users`
- Client
  - `/client` (dashboard), `/client/results`, `/client/audit`, `/client/timeline`, `/client/profile`
- Admin
  - `/admin` (dashboard), `/admin/users`, `/admin/contracts`, `/admin/nodes`, `/admin/logs`, `/admin/settings`, `/admin/profile`

## Development
- Lint: `npm run lint`
- Build: `npm run build`

UI/UX notes:
- Skeleton loaders and clear empty states across pages.
- Toasts surface success/errors; long actions show progress bars.
- Zimbabwe-centric placeholders are used in profile examples by default and can be customized.
