from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from .models import Project
from .serializers import ProjectSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.select_related("owner").all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def _is_manager(self, user) -> bool:
        role = getattr(getattr(user, "profile", None), "role", None)
        return bool(user and (user.is_staff or user.is_superuser or role in ("admin", "manager")))

    def create(self, request, *args, **kwargs):
        if not self._is_manager(request.user):
            raise PermissionDenied("Only managers can create projects")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def update(self, request, *args, **kwargs):
        if not self._is_manager(request.user):
            raise PermissionDenied("Only managers can update projects")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not self._is_manager(request.user):
            raise PermissionDenied("Only managers can update projects")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not self._is_manager(request.user):
            raise PermissionDenied("Only managers can delete projects")
        return super().destroy(request, *args, **kwargs)
