# Smartcontracts: SurveyRegistry

This Hardhat project provides the `SurveyRegistry` contract used by ESIMS for anchoring survey submissions and optionally storing encrypted file content fully on-chain.

## Requirements
- Node.js >= 18
- Hardhat 2.26.x with `@nomicfoundation/hardhat-toolbox@^6.1.0`

## Install & build
```
npm install
npx hardhat compile
```

## Local chain
```
npx hardhat node --hostname 127.0.0.1 --port 8545
npm run deploy:localhost
```
The deployment script prints the contract address; update backend `.env` as `ETH_CONTRACT_ADDRESS` and frontend `.env` as `VITE_CONTRACT_ADDRESS`.

## ABI export
```
npm run export:abi
```
Writes ABI to `smartcontracts/abi/survey_registry.json` for backend and `frontend/src/abi/survey_registry.json` for the UI.

## Contract interface (highlights)
- Integrity anchoring
  - `recordSubmission(uint256 surveyId, uint256 projectId, string ipfsCid, string checksum)`
  - `addFileHash(uint256 surveyId, bytes32 checksum)` and `getFileHashes(uint256)`
- Encrypted on-chain storage (preferred for confidentiality)
  - `addEncryptedChunks(uint256 surveyId, bytes[] payloads)` where `payload = nonce(12) || ciphertext || tag(16)`
  - `getEncryptedChunkCount(uint256)`, `getEncryptedChunkPointer(uint256, uint256)`, `readEncryptedChunk(uint256, uint256)`
- Legacy unencrypted storage (expensive, public readable)
  - `addFileChunk(uint256, bytes)`, `addFileChunks(uint256, bytes[])`, `getFileChunk*`

## Security notes
- Do not store plaintext on a public chain; anyone can read storage and calldata.
- Encrypt per chunk with AES‑256‑GCM client/backend‑side; keep AES keys off‑chain.
- Integrity is provided by storing the plaintext SHA‑256 on-chain.

## Retrieval
To reconstruct an encrypted file fully from chain:
1) Get chunk count via `getEncryptedChunkCount(surveyId)`.
2) For `i` in `[0..count-1]`:
   - Pointer = `getEncryptedChunkPointer(surveyId, i)`
   - Payload = `readEncryptedChunk(surveyId, i)` (or directly SSTORE2.read(pointer))
3) Split payload: `nonce(12) || ciphertext || tag(16)` and decrypt with AES‑256‑GCM using the off‑chain AES key.
4) Concatenate plaintext chunks in order.

## Events
- `Submitted`, `Approved`, `Rejected`
- `FileAttached(surveyId, checksum, actor, ts)`
- `EncryptedChunkStored(surveyId, index, pointer, size, chunkHash, actor, ts)`
- `FileChunk(surveyId, index, size, chunkHash, actor, ts)` (legacy)
