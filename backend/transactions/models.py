from django.db import models


class Transaction(models.Model):
    survey = models.ForeignKey("surveys.Survey", on_delete=models.CASCADE, related_name="transactions")
    private_tx_hash = models.CharField(max_length=100)
    public_anchor_tx_hash = models.CharField(max_length=100, blank=True, null=True)
    anchor_batch_id = models.CharField(max_length=100, blank=True, null=True)
    private_block_number = models.BigIntegerField(blank=True, null=True)
    public_block_number = models.BigIntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.private_tx_hash
