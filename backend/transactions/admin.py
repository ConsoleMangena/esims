from django.contrib import admin
from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "survey", "private_tx_hash", "public_anchor_tx_hash", "created_at")
    search_fields = ("private_tx_hash", "public_anchor_tx_hash", "anchor_batch_id")
