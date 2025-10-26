from rest_framework import viewsets
from .models import Transaction
from .serializers import TransactionSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.select_related("survey").all()
    serializer_class = TransactionSerializer
