from rest_framework import serializers
from .models import Survey


class SurveySerializer(serializers.ModelSerializer):
    class Meta:
        model = Survey
        fields = [
            "id",
            "project",
            "title",
            "description",
            "ipfs_cid",
            "checksum_sha256",
            "status",
            "submitted_by",
            "file",
            "file_category",
            "file_mime_type",
            "file_ext",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "submitted_by",
            "file_mime_type",
            "file_ext",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        file = attrs.get("file")
        category = attrs.get("file_category")
        if file and not category:
            raise serializers.ValidationError({"file_category": "This field is required when a file is uploaded."})
        return attrs
