# ESIMS: End‑to‑end survey data anchoring with optional encrypted on‑chain storage

This repo contains a working stack for survey data collection and blockchain anchoring:
- Backend: Django REST API (surveys, transactions, users) with Web3 integration
- Smart contracts: Hardhat project (`SurveyRegistry`) for integrity anchoring and encrypted on‑chain storage
- Frontend: React (Vite) dashboards for Surveyors, Managers, Clients

## How it works
1) Surveyor uploads a file in the Surveyor dashboard.
- Backend computes the file’s SHA‑256 checksum and tries to upload to IPFS; the IPFS CID is filled server‑side.
- The checksum and CID are stored in the database; IPFS CID and checksum inputs in the UI are read‑only.

2) Anchoring to blockchain
- Manager-only (from backend) or via MetaMask (optional):
  - `recordSubmission(surveyId, projectId, ipfsCid, checksum)` stores integrity metadata on-chain and emits `Submitted`.
  - Additional file hashes can be appended via `addFileHash` (one per attachment).
- Full on-chain storage (confidential): Manager can “Anchor full file” → the backend encrypts the file in chunks (AES‑256‑GCM) and stores ciphertext on-chain via SSTORE2 pointers.
  - Keys are managed server-side using a master Key Encryption Key (KEK). No raw data key is returned.
  - Two modes:
    - Envelope (default): generate per-file DEK, encrypt chunks; wrap DEK under KEK and store wrapped_dek + metadata in DB.
    - KDF: derive DEK = HKDF(KEK, salt, info="esims-v1"); store only salt + metadata in DB.  

3) Analytics and audit
- All blockchain txs are recorded in the `transactions` table.
- The API exposes gas/timing metrics; the Manager UI shows fees over time, gas per tx (with units), and speed histograms.

## Contracts (Solidity ^0.8.24)
`backend/smartcontracts/contracts/SurveyRegistry.sol`

State
- `surveys[surveyId] = { projectId, ipfsCid, checksum, status, submitter }`
- `_fileHashes[surveyId]` (bytes32[]) – per‑file hashes (e.g., SHA‑256)
- `_encPointers[surveyId]` (address[]) – SSTORE2 pointers for encrypted chunks
- Legacy (not confidential): `_fileChunks[surveyId]` (bytes[])

Key functions
- Integrity: `recordSubmission`, `addFileHash`, `getFileHashes`
- Encrypted storage: `addEncryptedChunks(bytes[] payloads)`, `getEncryptedChunkCount`, `getEncryptedChunkPointer`, `readEncryptedChunk`
- Legacy unencrypted: `addFileChunk(surveyId, bytes)`, `addFileChunks`

Events
- `Submitted`, `Approved`, `Rejected`
- `FileAttached` (hash-only)
- `EncryptedChunkStored(surveyId, index, pointer, size, chunkHash, actor, ts)`
- `FileChunk` (legacy raw chunks)

SSTORE2
- Minimal library at `contracts/lib/SSTORE2.sol`; writes data to contract bytecode (cheaper), reads via `extcodecopy`.
- We store encrypted payloads only: `nonce(12B) || ciphertext || tag(16B)` for each chunk.

## Security model
- Public chains are readable; never store plaintext if confidentiality matters.
- Encrypt per chunk with AES‑256‑GCM client/backend‑side; keep keys off‑chain (KMS/DB). Store only ciphertext on‑chain.
- Integrity: plaintext SHA‑256 is stored and emitted for verification.

## Backend highlights
Files: `backend/smartcontracts/eth.py`, `backend/surveys/views.py`
- Auto‑hash (SHA‑256) and auto‑CID (IPFS) on create.
- Manager‑only chain writes from backend (respecting `skip_chain` flag).
- `POST /api/surveys/{id}/anchor-file/` (Manager):
  - Reads file, splits ~24KB, encrypts each chunk (AES‑256‑GCM), calls `addEncryptedChunks`.
  - Returns `{ anchored_chunks, transactions, enc_scheme, key_version }` (no raw key).  
    Encryption metadata (e.g., `enc_scheme`, `key_version`, `wrapped_dek_b64` or `kdf_salt_b64`, and `enc_chunk_size`) is stored on the `Survey` row.
- Transactions API `/api/transactions/`: includes `etherscan_url`, `status`, `gas_used`, `effective_gas_price`, `fee_wei`, `fee_eth`, `block_timestamp`, `speed_seconds`.

## Frontend highlights
- Surveyor Submit: multiple files, auto SHA‑256, read‑only CID/checksum, optional MetaMask anchoring.
- Manager Verification: Approve/Reject, “Anchor full file” (calls backend to store encrypted chunks on-chain).
- Manager Transactions Log: all txs with Etherscan links.
- Reports & Analytics: fee over time, gas per tx (units shown), speed histogram, KPIs.

## Environment
Backend `.env` (see `backend/env.example`):
```
ETH_RPC_URL=http://127.0.0.1:8545
ETH_CHAIN_ID=31337
ETH_CONTRACT_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
ETH_PRIVATE_KEY=0x<one_prefunded_key_from_hardhat_node>
IPFS_API_URL=/dns/127.0.0.1/tcp/5001/http
# Encryption (server-managed keys)
ENC_SCHEME=envelope-aeskw-v1   # or kdf-hkdf-v1
DATA_KEK_B64=BASE64_OF_YOUR_KEK_BYTES   # e.g. ZXhhbXBsZV9rZWtfMzJieXRlcw==
DATA_KEK_VERSION=1
```

Frontend `.env`:
```
VITE_DEV_API_PROXY_TARGET=http://127.0.0.1:8000
VITE_CONTRACT_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
VITE_ETH_CHAIN_ID=31337
```

## Dev commands
From `backend/smartcontracts`:
- Install: `npm install`
- Start local chain: `npx hardhat node --hostname 127.0.0.1 --port 8545`
- Compile: `npx hardhat compile`
- Deploy localhost: `npm run deploy:localhost`
- Export ABI for backend: `npm run export:abi`

Backend:
- Install Python deps: `pip install -r backend/requirements.txt`
- Run Django as usual (`manage.py runserver`); ensure `.env` is set.

Frontend:
- `npm install`
- `npm run dev` or `npm run build && npm run preview`

## Recovering encrypted files from chain
Given `surveyId`:
1) Count: `getEncryptedChunkCount(surveyId)`.
2) For each `i`: pointer via `getEncryptedChunkPointer(surveyId, i)` then bytes via `readEncryptedChunk(surveyId, i)`.
3) Split payload: `nonce(12) || ciphertext || tag(16)`.
4) Obtain DEK:
   - Envelope mode: get `wrapped_dek_b64` + `key_version` from DB; unwrap with your KEK (matched by `key_version`).
   - KDF mode: get `kdf_salt_b64` + `key_version` from DB; derive DEK = HKDF(KEK, salt, info="esims-v1").
5) Decrypt each payload with AES‑GCM using the DEK and reassemble.

Only the KEK (and DB metadata) is required to recover; nothing sensitive is on-chain.
