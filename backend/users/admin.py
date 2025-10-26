from django.contrib import admin
from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "role", "created_at")
    search_fields = ("user__username", "user__email", "role")
    list_filter = ("role",)
