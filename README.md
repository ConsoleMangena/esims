# ESIMS: Survey data anchoring on a private Ethereum chain (raw chunks + on-chain headers)

This repo contains a full stack for survey data collection and blockchain anchoring on a private chain:
- Backend: Django REST API (surveys, transactions, users) with Web3 integration
- Smart contracts: Hardhat project (`SurveyRegistry`) for integrity anchoring and raw chunk storage
- Frontend: React (Vite) dashboards for Surveyors, Managers, Clients, Admins

## How it works
1) Surveyor uploads a file in the Surveyor dashboard.
- Backend (and UI) compute the file’s SHA‑256 checksum; CID may be supplied by an external store (IPFS optional).
- The checksum and metadata are stored in the database; in the UI the checksum input is read‑only.

2) Anchoring to blockchain (private chain)
- Manager-only via backend APIs (no MetaMask required):
  - `recordSubmission(surveyId, projectId, ipfsCid, checksum)` writes integrity metadata on-chain and emits `Submitted`.
  - Optionally, “Anchor full file” stores the original file on-chain in raw chunks.
- Chunking: the backend splits the file into bounded payloads and commits them in multiple transactions with a capped gas.

3) Verification and recovery
- Verify Original File (Manager):
  - Method 1: Compare local SHA‑256 vs on-chain checksum.
  - Method 2: Verify each raw chunk byte‑for‑byte from chain against the local file, with a progress bar and final verdict.
- Recovery (Manager → Transactions): reassemble the raw file from on-chain chunks and store it server-side for download.

4) Analytics and audit
- All chain txs are recorded in the `transactions` table and surfaced in UI with links to the block explorer.
- Admin dashboard shows system KPIs, API health/latency and recent private-chain activity.

## Contracts (Solidity ^0.8.24)
`backend/smartcontracts/contracts/SurveyRegistry.sol`

State
- `surveys[surveyId] = { projectId, ipfsCid, checksum, status, submitter }`
- `_fileHashes[surveyId]` (bytes32[]) – additional file hashes
- `_fileChunks[surveyId]` (bytes[]) – raw chunks for original file (private chain only)

Key functions
- Integrity: `recordSubmission(uint256, uint256, string, string)`, `addFileHash(uint256, bytes32)`, `getFileHashes(uint256)`
- Raw storage: `addFileChunk(uint256, bytes)`, `addFileChunks(uint256, bytes[])`, `getFileChunkCount(uint256)`, `getFileChunk(uint256, uint256)`

Events
- `Submitted`, `Approved`, `Rejected`
- `FileAttached(surveyId, checksum, actor, ts)`
- `FileChunk(surveyId, index, size, chunkHash, actor, ts)`

Notes
- Encrypted storage paths can be supported by the contract (via SSTORE2) but are not used in this deployment.

## Backend highlights
Files: `backend/smartcontracts/eth.py`, `backend/surveys/views.py`
- Auto SHA‑256 on create; manager-only chain writes (respect `skip_chain`).
- Endpoints (abbrev):
  - `POST /api/surveys/{id}/record-chain/` → write header on-chain.
  - `POST /api/surveys/{id}/anchor-file/` → store raw chunks on private chain.
  - `POST /api/surveys/{id}/recover-file/` → reconstruct file from chain and store server-side.
  - `GET /api/surveys/{id}/onchain-record/` → fetch header JSON (download supported in UI).
  - `GET /api/surveys/{id}/chunks/` → list count; `GET /api/surveys/{id}/chunks/{i}/download/` → fetch chunk bytes.
- Transactions API `/api/transactions/`: includes block numbers and optional explorer URLs.

## Frontend highlights
- Surveyor Submit: file upload, auto SHA‑256, clearer validation.
- Manager Verification: Approve/Reject, Record on chain, Anchor full file; buttons auto-disable while pending.
- Verify Original File (new): 2-step verification with progress bars; drag‑drop; clear empty/loaded states.
- Transactions Log: grouped by survey, chunk list grouped 0–99, 100–199… with per‑chunk sizes; recovery workflow.
- Admin Dashboard (new): system health (API online/latency, recent chain activity) and KPIs.
- Global toasts and consistent progress indicators.

## Environment
Backend `.env` (example):
```
ETH_RPC_URL=http://127.0.0.1:8545
ETH_CHAIN_ID=31337
ETH_CONTRACT_ADDRESS=0x... # address from your deploy
ETH_PRIVATE_KEY=0x...      # prefunded account on the private node
# Optional: IPFS gateway/API settings if you use IPFS
IPFS_API_URL=/dns/127.0.0.1/tcp/5001/http
```

Frontend `.env` (optional overrides):
```
VITE_API_BASE=http://127.0.0.1:8000/api/
VITE_CONTRACT_ADDRESS=0x...
VITE_ETH_CHAIN_ID=31337
```
(If `VITE_API_BASE` is not set, the UI uses `window.location.origin + /api/`.)

## Dev commands
From `backend/smartcontracts`:
- Install: `npm install`
- Start local chain: `npx hardhat node --hostname 127.0.0.1 --port 8545`
- Compile: `npx hardhat compile`
- Deploy localhost: `npm run deploy:localhost`
- Export ABI for backend+frontend: `npm run export:abi`

Backend:
- Install Python deps: `pip install -r backend/requirements.txt`
- Run Django API: `python manage.py runserver` (ensure `.env` is configured)

Frontend:
- `npm install`
- `npm run dev` (Vite) or `npm run build && npm run preview`

## Recovery and verification (raw chunks)
Given `surveyId`:
1) Count chunks: `GET /api/surveys/{id}/chunks/` → `{ count }`.
2) For `i` in `[0..count-1]`: `GET /api/surveys/{id}/chunks/{i}/download/` to stream bytes.
3) Concatenate in order; the UI can do server-side recovery via `POST /recover-file/`.

To verify originality without recovery:
- Compare your local SHA‑256 with the on-chain checksum (`GET /onchain-record/`).
- Optionally verify chunks byte-for-byte using the Verify Original File page.
