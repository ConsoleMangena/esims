from django.db import models
from django.conf import settings


class Profile(models.Model):
    ROLE_CHOICES = [
        ("surveyor", "Surveyor"),
        ("manager", "Manager"),
        ("client", "Client"),
        ("admin", "Admin"),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="surveyor")
    avatar = models.FileField(upload_to="avatars/%Y/%m/%d/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return str(self.user)
