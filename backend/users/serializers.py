from rest_framework import serializers
from .models import Profile
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
from django.contrib.auth.password_validation import validate_password
from django.core import exceptions as dj_exceptions

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", required=False, allow_blank=True)
    last_name = serializers.CharField(source="user.last_name", required=False, allow_blank=True)
    avatar = serializers.FileField(required=False, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    job_title = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    company = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Profile
        fields = [
            "id",
            "user",
            "username",
            "email",
            "first_name",
            "last_name",
            "avatar",
            "phone",
            "job_title",
            "company",
            "address",
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
        user_data = validated_data.pop("user", {})
        # Update profile fields first
        instance = super().update(instance, validated_data)
        # Persist nested user fields
        if user_data:
            changed = False
            first = user_data.get("first_name")
            last = user_data.get("last_name")
            if first is not None and first != instance.user.first_name:
                instance.user.first_name = first
                changed = True
            if last is not None and last != instance.user.last_name:
                instance.user.last_name = last
                changed = True
            if changed:
                # Save only changed columns
                update_fields = []
                if first is not None:
                    update_fields.append("first_name")
                if last is not None:
                    update_fields.append("last_name")
                instance.user.save(update_fields=update_fields or None)
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
    email = serializers.EmailField(
        required=True,
        allow_blank=False,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                lookup="iexact",
                message="An account with this email already exists.",
            )
        ],
    )
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=Profile.ROLE_CHOICES, required=False)

    def validate_email(self, value: str):
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("Email is required")
        # Extra safety – case-insensitive uniqueness
        try:
            if User.objects.filter(email__iexact=v).exists():
                raise serializers.ValidationError("An account with this email already exists.")
        except Exception:
            # If DB check fails, fall back to value
            pass
        return v

    def validate(self, attrs):
        # Enforce server-side strong password policy using Django validators
        username = attrs.get('username')
        email = attrs.get('email')
        raw_password = attrs.get('password')
        dummy_user = User(username=username, email=email)
        try:
            validate_password(raw_password, user=dummy_user)
        except dj_exceptions.ValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)})
        return attrs

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
