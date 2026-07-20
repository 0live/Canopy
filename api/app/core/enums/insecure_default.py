from enum import Enum


class InsecureDefault(str, Enum):
    """Placeholder/example values that must not survive into production."""

    UNSET_CREDENTIAL = "To set"
    DEFAULT_PRIVATE_KEY = "your_default_secret_key_change_me"
    DEFAULT_ALTCHA_HMAC_KEY = "dev_altcha_hmac_key_change_me"
    DEFAULT_SMTP_HOST = "mailpit"
