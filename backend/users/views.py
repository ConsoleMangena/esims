from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Profile
from .serializers import ProfileSerializer


class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        user = self.request.user
        base_qs = Profile.objects.select_related("user")
        if user.is_staff or user.is_superuser:
            return base_qs
        return base_qs.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def update(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request, "data") else {}
        if "role" in data:
            can_change = (
                request.user.is_staff
                or request.user.is_superuser
                or getattr(getattr(request.user, "profile", None), "role", None) == "admin"
            )
            if not can_change:
                return Response({"detail": "Not authorized to change role"}, status=403)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request, "data") else {}
        if "role" in data:
            can_change = (
                request.user.is_staff
                or request.user.is_superuser
                or getattr(getattr(request.user, "profile", None), "role", None) == "admin"
            )
            if not can_change:
                return Response({"detail": "Not authorized to change role"}, status=403)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=["get", "patch", "put"], url_path="me")
    def me(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        if request.method in ("PATCH", "PUT"):
            data = request.data
            # Only staff/superusers/admins can change role (managers cannot)
            if "role" in data:
                can_change = (
                    request.user.is_staff
                    or request.user.is_superuser
                    or getattr(getattr(request.user, "profile", None), "role", None) == "admin"
                )
                if not can_change:
                    return Response({"detail": "Not authorized to change role"}, status=403)
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
