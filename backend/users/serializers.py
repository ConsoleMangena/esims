from rest_framework import serializers
from .models import Profile
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    avatar = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Profile
        fields = [
            "id",
            "user",
            "username",
            "email",
            "avatar",
            "role",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user", "created_at", "updated_at"]

    MAX_AVATAR_MB = 5
    ALLOWED_IMAGE_CT = {"image/jpeg", "image/png", "image/webp"}
    ALLOWED_EXT = {"jpg", "jpeg", "png", "webp"}

    def validate_avatar(self, file):
        if file is None:
            return file
        size = getattr(file, "size", 0) or 0
        if size > self.MAX_AVATAR_MB * 1024 * 1024:
            raise serializers.ValidationError(
                f"Avatar too large. Max {self.MAX_AVATAR_MB}MB"
            )
        ctype = getattr(file, "content_type", "") or ""
        name = getattr(file, "name", "") or ""
        ext = (name.rsplit(".", 1)[-1].lower() if "." in name else "")
        if ctype and ctype not in self.ALLOWED_IMAGE_CT:
            raise serializers.ValidationError("Unsupported image type. Use JPG/PNG/WEBP")
        if not ctype and ext and ext not in self.ALLOWED_EXT:
            raise serializers.ValidationError("Unsupported image extension. Use JPG/PNG/WEBP")
        return file

    def _compress_avatar(self, file, user_id: int) -> ContentFile:
        img = Image.open(file)
        # Normalize mode
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        # Resize keeping aspect ratio, max 512x512
        try:
            from PIL import Image as PILImage
            resample = PILImage.Resampling.LANCZOS  # Pillow >= 9.1
        except Exception:
            resample = Image.LANCZOS
        img.thumbnail((512, 512), resample)
        # Encode to JPEG with good quality/size balance
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=80, optimize=True, progressive=True)
        buf.seek(0)
        return ContentFile(buf.getvalue(), name=f"avatar_{user_id}.jpg")

    def update(self, instance, validated_data):
        avatar = validated_data.pop("avatar", None)
        # Update other fields first
        instance = super().update(instance, validated_data)
        if avatar is not None:
            compressed = self._compress_avatar(avatar, instance.user_id)
            # Save replaces old file
            instance.avatar.save(compressed.name, compressed, save=True)
        return instance


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(
        max_length=150,
        validators=[UniqueValidator(queryset=User.objects.all())],
    )
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=Profile.ROLE_CHOICES, required=False)

    def create(self, validated_data):
        username = validated_data["username"]
        email = validated_data.get("email")
        password = validated_data["password"]
        role = validated_data.get("role")

        user = User.objects.create_user(username=username, email=email, password=password)
        # Profile auto-created via signal; update role if provided
        if role:
            try:
                prof = user.profile
                prof.role = role
                prof.save(update_fields=["role"]) 
            except Profile.DoesNotExist:
                Profile.objects.create(user=user, role=role)
        return user
