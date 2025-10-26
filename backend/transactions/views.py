from rest_framework import viewsets
from rest_framework.response import Response
from .models import Transaction
from .serializers import TransactionSerializer
try:
    from smartcontracts.eth import get_tx_receipt
except Exception:  # pragma: no cover
    get_tx_receipt = None


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.select_related("survey").all()
    serializer_class = TransactionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        survey_id = self.request.query_params.get("survey")
        if survey_id:
            try:
                qs = qs.filter(survey_id=int(survey_id))
            except Exception:
                pass
        return qs.order_by("-created_at")

    def list(self, request, *args, **kwargs):
        # Opportunistically fill missing block numbers for filtered results
        qs = self.get_queryset()
        survey_id = request.query_params.get("survey")
        if survey_id and get_tx_receipt is not None:
            for t in qs:
                if not t.public_block_number and (t.public_anchor_tx_hash or t.private_tx_hash):
                    txh = t.public_anchor_tx_hash or t.private_tx_hash
                    try:
                        rec = get_tx_receipt(txh)
                        if rec and rec.get("blockNumber"):
                            t.public_block_number = rec["blockNumber"]
                            t.save(update_fields=["public_block_number", "updated_at"])
                    except Exception:
                        pass
        page = self.paginate_queryset(qs)
        if page is not None:
            ser = self.get_serializer(page, many=True)
            return self.get_paginated_response(ser.data)
        ser = self.get_serializer(qs, many=True)
        return Response(ser.data)
