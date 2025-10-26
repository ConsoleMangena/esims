from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Profile
from .serializers import ProfileSerializer


class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        user = self.request.user
        base_qs = Profile.objects.select_related("user")
        if user.is_staff or user.is_superuser:
            return base_qs
        return base_qs.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get", "patch", "put"], url_path="me")
    def me(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        if request.method in ("PATCH", "PUT"):
            data = request.data
            # Only staff/superusers/admins/managers can change role
            if "role" in data:
                can_change = (
                    request.user.is_staff
                    or request.user.is_superuser
                    or getattr(getattr(request.user, "profile", None), "role", None)
                    in ("admin", "manager")
                )
                if not can_change:
                    return Response({"detail": "Not authorized to change role"}, status=403)
            # Only managers/admins can set KEK fields
            if ("data_kek_b64" in data) or ("data_kek_version" in data):
                can_set_kek = (
                    request.user.is_staff
                    or request.user.is_superuser
                    or getattr(getattr(request.user, "profile", None), "role", None)
                    in ("admin", "manager")
                )
                if not can_set_kek:
                    return Response({"detail": "Not authorized to set manager key"}, status=403)
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
