from django.contrib import admin
from .models import Survey


@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "project", "status", "created_at")
    list_filter = ("status", "project")
    search_fields = ("title", "ipfs_cid", "checksum_sha256")
