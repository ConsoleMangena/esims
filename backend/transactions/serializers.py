from rest_framework import serializers
from .models import Transaction
import os
from typing import Any, Optional

try:
    from smartcontracts.eth import get_tx_details
except Exception:  # pragma: no cover
    get_tx_details = None  # type: ignore


class TransactionSerializer(serializers.ModelSerializer):
    etherscan_url = serializers.SerializerMethodField(read_only=True)
    status = serializers.SerializerMethodField(read_only=True)
    gas_used = serializers.SerializerMethodField(read_only=True)
    effective_gas_price = serializers.SerializerMethodField(read_only=True)
    fee_wei = serializers.SerializerMethodField(read_only=True)
    fee_eth = serializers.SerializerMethodField(read_only=True)
    block_timestamp = serializers.SerializerMethodField(read_only=True)
    speed_seconds = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "survey",
            "private_tx_hash",
            "public_anchor_tx_hash",
            "anchor_batch_id",
            "private_block_number",
            "public_block_number",
            "etherscan_url",
            "status",
            "gas_used",
            "effective_gas_price",
            "fee_wei",
            "fee_eth",
            "block_timestamp",
            "speed_seconds",
            "created_at",
            "updated_at",
        ]

    def _details(self, obj: Transaction) -> Optional[dict[str, Any]]:
        if get_tx_details is None:
            return None
        txh = obj.public_anchor_tx_hash or obj.private_tx_hash
        if not txh:
            return None
        try:
            return get_tx_details(txh)  # type: ignore[misc]
        except Exception:
            return None

    def get_etherscan_url(self, obj: Transaction):  # type: ignore[name-defined]
        tx = obj.public_anchor_tx_hash or obj.private_tx_hash
        if not tx:
            return None
        try:
            chain_id = int(os.getenv("ETH_CHAIN_ID", "0") or 0)
        except Exception:
            chain_id = 0
        base = "https://etherscan.io"
        if chain_id == 11155111:
            base = "https://sepolia.etherscan.io"
        elif chain_id == 5:
            base = "https://goerli.etherscan.io"
        elif chain_id == 1:
            base = "https://etherscan.io"
        return f"{base}/tx/{tx}"

    def get_status(self, obj: Transaction):
        d = self._details(obj)
        return None if not d else d.get("status")

    def get_gas_used(self, obj: Transaction):
        d = self._details(obj)
        return None if not d else d.get("gasUsed")

    def get_effective_gas_price(self, obj: Transaction):
        d = self._details(obj)
        return None if not d else d.get("effectiveGasPrice")

    def get_fee_wei(self, obj: Transaction):
        d = self._details(obj)
        return None if not d else d.get("feeWei")

    def get_fee_eth(self, obj: Transaction):
        d = self._details(obj)
        try:
            fw = None if not d else d.get("feeWei")
            return None if fw is None else float(fw) / 1e18
        except Exception:
            return None

    def get_block_timestamp(self, obj: Transaction):
        d = self._details(obj)
        return None if not d else d.get("blockTimestamp")

    def get_speed_seconds(self, obj: Transaction):
        d = self._details(obj)
        if not d:
            return None
        ts = d.get("blockTimestamp")
        try:
            if ts is None or not obj.created_at:
                return None
            created = int(obj.created_at.timestamp())
            return max(0, int(ts) - created)
        except Exception:
            return None
