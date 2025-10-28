import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class StrongPasswordValidator:
    """Require a strong password: at least 12 chars, with upper, lower, digit and special.
    This complements Django's built-in validators configured in AUTH_PASSWORD_VALIDATORS.
    """

    def validate(self, password: str, user=None):  # noqa: D401
        if password is None:
            raise ValidationError(_("Password is required."))
        if len(password) < 12:
            raise ValidationError(_("Password must be at least 12 characters long."))
        if not re.search(r"[A-Z]", password or ""):
            raise ValidationError(_("Password must contain at least one uppercase letter."))
        if not re.search(r"[a-z]", password or ""):
            raise ValidationError(_("Password must contain at least one lowercase letter."))
        if not re.search(r"\d", password or ""):
            raise ValidationError(_("Password must contain at least one digit."))
        if not re.search(r"[^A-Za-z0-9]", password or ""):
            raise ValidationError(_("Password must contain at least one special character."))
        # Optional: check against parts of username/email
        if user is not None:
            uname = getattr(user, "username", None) or ""
            mail = getattr(user, "email", None) or ""
            for token in filter(None, {uname, *(mail.split("@"))}):
                if token and token.lower() in password.lower():
                    raise ValidationError(_("Password is too similar to user information."))

    def get_help_text(self):  # noqa: D401
        return _(
            "Your password must be at least 12 characters long and include uppercase, lowercase, a digit, and a special character."
        )
