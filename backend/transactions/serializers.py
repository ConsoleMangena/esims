from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
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
            "created_at",
            "updated_at",
        ]
