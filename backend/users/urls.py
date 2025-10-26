from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from .views import ProfileViewSet
from .auth_views import RegisterView, LogoutView

router = DefaultRouter()
router.register(r"users/profiles", ProfileViewSet, basename="profile")

urlpatterns = [
    path("auth/register", RegisterView.as_view(), name="auth-register"),
    path("auth/login", TokenObtainPairView.as_view(), name="auth-login"),
    path("auth/refresh", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/verify", TokenVerifyView.as_view(), name="auth-verify"),
    path("auth/logout", LogoutView.as_view(), name="auth-logout"),
] + router.urls
