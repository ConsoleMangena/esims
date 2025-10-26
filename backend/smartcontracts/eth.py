import os
from typing import Any, Dict, Optional, Tuple
from pathlib import Path
from web3 import Web3
from web3.types import TxParams
from eth_account import Account
import json

# Lazy singletons
_w3: Optional[Web3] = None
_contract = None
_from_addr: Optional[str] = None

BASE_DIR = Path(__file__).resolve().parent.parent
ABI_PATH = BASE_DIR / "smartcontracts" / "abi" / "survey_registry.json"


def get_web3() -> Optional[Web3]:
    global _w3
    if _w3 is not None:
        return _w3
    rpc = os.getenv("ETH_RPC_URL", "").strip()
    if not rpc:
        return None
    _w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 20}))
    return _w3


def get_encrypted_chunk_count(survey_id: int) -> int:
    """Read-only: return the number of encrypted chunks for a survey."""
    contract = _get_contract()
    if not contract:
        raise RuntimeError("Ethereum not configured (missing contract)")
    try:
        return int(contract.functions.getEncryptedChunkCount(int(survey_id)).call())
    except Exception as e:
        raise RuntimeError(f"read getEncryptedChunkCount failed: {e}")


def read_encrypted_chunk(survey_id: int, index: int) -> bytes:
    """Read-only: return the encrypted chunk bytes (nonce||ciphertext||tag) for given index."""
    contract = _get_contract()
    if not contract:
        raise RuntimeError("Ethereum not configured (missing contract)")
    try:
        data = contract.functions.readEncryptedChunk(int(survey_id), int(index)).call()
        # Web3 typically returns bytes for bytes memory; ensure it's bytes
        if isinstance(data, (bytes, bytearray)):
            return bytes(data)
        try:
            return Web3.to_bytes(data)
        except Exception:
            try:
                return bytes.fromhex(str(data).removeprefix("0x"))
            except Exception:
                return data
    except Exception as e:
        raise RuntimeError(f"read readEncryptedChunk failed: {e}")


def _get_contract() -> Optional[Any]:
    global _contract, _from_addr
    if _contract is not None:
        return _contract
    w3 = get_web3()
    if not w3:
        return None
    address = os.getenv("ETH_CONTRACT_ADDRESS", "").strip()
    if not address:
        return None
    if not ABI_PATH.exists():
        return None
    with open(ABI_PATH, "r") as f:
        abi = json.load(f)
    _contract = w3.eth.contract(address=Web3.to_checksum_address(address), abi=abi)
    # derive from address
    pk = os.getenv("ETH_PRIVATE_KEY", "").strip()
    if pk:
        acct = Account.from_key(pk)
        _from_addr = acct.address
    return _contract


def _build_and_send_tx(fn_name: str, *args) -> Tuple[str, Optional[int]]:
    """Build and send a contract TX. Returns (tx_hash, block_number or None)."""
    w3 = get_web3()
    contract = _get_contract()
    if not w3 or not contract:
        raise RuntimeError("Ethereum not configured (missing RPC/contract/ABI)")

    pk = os.getenv("ETH_PRIVATE_KEY", "").strip()
    if not pk:
        raise RuntimeError("Missing ETH_PRIVATE_KEY")
    acct = Account.from_key(pk)
    from_addr = acct.address

    chain_id = int(os.getenv("ETH_CHAIN_ID", "0") or 0) or w3.eth.chain_id
    nonce = w3.eth.get_transaction_count(from_addr, "pending")

    fn = getattr(contract.functions, fn_name)(*args)
    # Estimate gas
    try:
        gas_estimate = fn.estimate_gas({"from": from_addr})
    except Exception:
        gas_estimate = 250000

    # EIP-1559 params
    try:
        max_priority = w3.eth.max_priority_fee
    except Exception:
        max_priority = Web3.to_wei(2, "gwei")
    try:
        base_gas = w3.eth.gas_price
    except Exception:
        base_gas = Web3.to_wei(20, "gwei")

    tx: TxParams = {
        "from": from_addr,
        "nonce": nonce,
        "chainId": chain_id,
        "gas": int(gas_estimate * 1.2),
        "maxFeePerGas": int(base_gas * 2),
        "maxPriorityFeePerGas": int(max_priority),
    }

    built = fn.build_transaction(tx)
    signed = w3.eth.account.sign_transaction(built, private_key=pk)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    h = tx_hash.hex()
    # Try to get receipt quickly (non-blocking feel) with short timeout
    try:
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=20)
        return h, receipt.blockNumber if receipt else None
    except Exception:
        return h, None


def record_submission(survey_id: int, project_id: int, ipfs_cid: str, checksum: str) -> Tuple[str, Optional[int]]:
    return _build_and_send_tx("recordSubmission", int(survey_id), int(project_id), ipfs_cid, checksum)


def mark_approved(survey_id: int) -> Tuple[str, Optional[int]]:
    return _build_and_send_tx("markApproved", int(survey_id))


def mark_rejected(survey_id: int) -> Tuple[str, Optional[int]]:
    return _build_and_send_tx("markRejected", int(survey_id))


def add_file_hash(survey_id: int, checksum_hex: str) -> Tuple[str, Optional[int]]:
    """Append a file hash (sha256) to a survey's attachment list on-chain.
    checksum_hex must be a 64-hex sha256 string (with or without 0x).
    """
    h = checksum_hex.lower().strip()
    if h.startswith("0x"):
        h = h[2:]
    if len(h) != 64:
        raise ValueError("checksum must be 32-byte (64 hex chars)")
    arg = Web3.to_bytes(hexstr="0x" + h)
    return _build_and_send_tx("addFileHash", int(survey_id), arg)


def add_file_chunk(survey_id: int, chunk: bytes) -> Tuple[str, Optional[int]]:
    """Append a raw file chunk to on-chain storage (bytes)."""
    return _build_and_send_tx("addFileChunk", int(survey_id), chunk)


def add_file_chunks(survey_id: int, chunks: list[bytes]) -> Tuple[str, Optional[int]]:
    """Append multiple raw chunks in one tx (bytes[])."""
    return _build_and_send_tx("addFileChunks", int(survey_id), chunks)


def add_encrypted_chunks(survey_id: int, payloads: list[bytes]) -> Tuple[str, Optional[int]]:
    """Store encrypted file payloads (nonce||ciphertext_with_tag) via SSTORE2 pointers (bytes[])."""
    return _build_and_send_tx("addEncryptedChunks", int(survey_id), payloads)


def get_tx_receipt(tx_hash: str) -> Optional[Dict[str, Any]]:
    w3 = get_web3()
    if not w3:
        return None
    try:
        # tx_hash should be 0x-prefixed hex string
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        return {
            "blockNumber": getattr(receipt, "blockNumber", None),
            "status": getattr(receipt, "status", None),
        }
    except Exception:
        return None


def get_tx_details(tx_hash: str) -> Optional[Dict[str, Any]]:
    """Return gas and timing details for a transaction: blockNumber, status, gasUsed, effectiveGasPrice, feeWei, blockTimestamp."""
    w3 = get_web3()
    if not w3:
        return None
    try:
        rc = w3.eth.get_transaction_receipt(tx_hash)
        if rc is None:
            return None
        block_number = getattr(rc, "blockNumber", None)
        gas_used = getattr(rc, "gasUsed", None)
        eff_price = getattr(rc, "effectiveGasPrice", None)
        status = getattr(rc, "status", None)
        ts = None
        if block_number is not None:
            try:
                blk = w3.eth.get_block(block_number)
                ts = getattr(blk, "timestamp", None)
            except Exception:
                ts = None
        fee_wei = None
        try:
            if gas_used is not None and eff_price is not None:
                fee_wei = int(gas_used) * int(eff_price)
        except Exception:
            fee_wei = None
        return {
            "blockNumber": block_number,
            "status": status,
            "gasUsed": gas_used,
            "effectiveGasPrice": eff_price,
            "feeWei": fee_wei,
            "blockTimestamp": ts,
        }
    except Exception:
        return None
