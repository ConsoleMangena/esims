from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import mimetypes
from pathlib import Path
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Survey
from .serializers import SurveySerializer
from users.models import Profile


class SurveyViewSet(viewsets.ModelViewSet):
    queryset = Survey.objects.select_related("project", "submitted_by").all()
    serializer_class = SurveySerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        user = self.request.user
        try:
            role = user.profile.role  # type: ignore[attr-defined]
        except Profile.DoesNotExist:
            role = None

        base = Survey.objects.select_related("project", "submitted_by")
        if user.is_superuser or user.is_staff or role in ("admin", "manager"):
            return base
        if role == "client":
            return base.filter(status="approved")
        # default: surveyor sees own submissions only
        return base.filter(submitted_by=user)

    def perform_create(self, serializer):
        upload = self.request.FILES.get("file")
        file_mime = None
        file_ext = None
        if upload is not None:
            # Guess using filename; browsers may include content_type but rely on path for consistency
            guessed, _ = mimetypes.guess_type(upload.name)
            file_mime = guessed or getattr(upload, "content_type", "") or ""
            file_ext = Path(upload.name).suffix.lstrip(".").lower()
        serializer.save(
            submitted_by=self.request.user,
            file_mime_type=file_mime or "",
            file_ext=file_ext or "",
        )

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        user = request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        if not (user.is_staff or user.is_superuser or role in ("admin", "manager")):
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        survey = self.get_object()
        survey.status = "approved"
        survey.save(update_fields=["status", "updated_at"])
        return Response(SurveySerializer(survey).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        user = request.user
        role = getattr(getattr(user, "profile", None), "role", None)
        if not (user.is_staff or user.is_superuser or role in ("admin", "manager")):
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        survey = self.get_object()
        survey.status = "rejected"
        survey.save(update_fields=["status", "updated_at"])
        return Response(SurveySerializer(survey).data)
