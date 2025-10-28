from rest_framework import serializers
from .models import Survey


class SurveySerializer(serializers.ModelSerializer):
    # Indicate if this survey has an on-chain record and/or raw on-chain file chunks
    has_onchain_record = serializers.SerializerMethodField(read_only=True)
    has_onchain_file = serializers.SerializerMethodField(read_only=True)

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
            "recovered_file",
            "file_category",
            "file_mime_type",
            "file_ext",
            "has_onchain_record",
            "has_onchain_file",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "submitted_by",
            "recovered_file",
            "file_mime_type",
            "file_ext",
            "has_onchain_record",
            "has_onchain_file",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            # Backend will compute from the uploaded file when provided
            "checksum_sha256": {"required": False},
            # Backend will attempt to upload to IPFS and fill this
            "ipfs_cid": {"required": False},
        }

    def get_has_onchain_record(self, obj: Survey) -> bool:  # type: ignore[name-defined]
        try:
            from smartcontracts.eth import get_onchain_record  # type: ignore
        except Exception:
            return False
        try:
            rec = get_onchain_record(obj.id)
            return bool(rec and rec.get("submitter") and str(rec.get("submitter")).lower() != "0x0000000000000000000000000000000000000000")
        except Exception:
            return False

    def get_has_onchain_file(self, obj: Survey) -> bool:  # type: ignore[name-defined]
        try:
            from smartcontracts.eth import get_file_chunk_count  # type: ignore
        except Exception:
            return False
        try:
            cnt = get_file_chunk_count(obj.id)
            return bool(cnt and cnt > 0)
        except Exception:
            return False

    def validate(self, attrs):
        file = attrs.get("file")
        category = attrs.get("file_category")
        if file and not category:
            raise serializers.ValidationError({"file_category": "This field is required when a file is uploaded."})
        return attrs
