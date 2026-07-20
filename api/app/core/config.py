from functools import lru_cache
from typing import List

from pydantic import RedisDsn, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.enums.environment import Environment
from app.core.enums.insecure_default import InsecureDefault
from app.core.exceptions import SecurityException


def _reject_default_in_prod(
    v: str, info: ValidationInfo, placeholder: InsecureDefault, error_key: str
) -> str:
    if info.data.get("env") == Environment.PROD and v == placeholder.value:
        raise SecurityException(key=error_key)
    return v


class Settings(BaseSettings):
    env: Environment = Environment.DEV
    private_key: str = InsecureDefault.DEFAULT_PRIVATE_KEY.value
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    locale: str = "en"
    site_address: str = ""

    @property
    def allowed_hosts(self) -> List[str]:
        """Derive allowed hosts from SITE_ADDRESS."""
        if self.env in [Environment.DEV, Environment.TEST]:
            return ["*"]

        if self.site_address:
            host = (
                self.site_address.strip().replace("https://", "").replace("http://", "")
            )
            host = host.split("/")[0]
            return [host, f"*.{host}"]

        raise SecurityException(key="config.site_address_missing")

    @property
    def allowed_origins(self) -> List[str]:
        """Derive CORS allowed origins from SITE_ADDRESS."""
        if self.env in [Environment.DEV, Environment.TEST]:
            return ["*"]

        if self.site_address:
            host = (
                self.site_address.strip().replace("https://", "").replace("http://", "")
            )
            host = host.split("/")[0]
            return [f"https://{host}"]

        raise SecurityException(key="config.site_address_missing")

    @field_validator("private_key")
    def validate_secret_key(cls, v: str, info: ValidationInfo) -> str:
        return _reject_default_in_prod(
            v, info, InsecureDefault.DEFAULT_PRIVATE_KEY, "config.insecure_secret_key"
        )

    # Database components
    postgres_user: str = InsecureDefault.UNSET_CREDENTIAL.value
    postgres_password: str = InsecureDefault.UNSET_CREDENTIAL.value
    postgres_db: str = "default"
    postgres_host: str = "localhost"
    postgres_port: str = "5432"
    database_url: str = "postgresql+psycopg://default:default@localhost:5432/default"
    postgres_echo: bool = False

    @field_validator("postgres_user")
    @classmethod
    def validate_postgres_user(cls, v: str, info: ValidationInfo) -> str:
        return _reject_default_in_prod(
            v, info, InsecureDefault.UNSET_CREDENTIAL, "config.insecure_postgres_user"
        )

    @field_validator("postgres_password")
    @classmethod
    def validate_postgres_password(cls, v: str, info: ValidationInfo) -> str:
        return _reject_default_in_prod(
            v,
            info,
            InsecureDefault.UNSET_CREDENTIAL,
            "config.insecure_postgres_password",
        )

    # Martin tile server (internal network)
    martin_internal_url: str = "http://martin:3000"

    # Google SSO
    activate_google_auth: bool = False
    google_client_id: str | None = None
    google_client_secret: str | None = None

    # Altcha captcha
    altcha_hmac_key: str = InsecureDefault.DEFAULT_ALTCHA_HMAC_KEY.value

    @field_validator("altcha_hmac_key")
    @classmethod
    def validate_altcha_hmac_key(cls, v: str, info: ValidationInfo) -> str:
        return _reject_default_in_prod(
            v,
            info,
            InsecureDefault.DEFAULT_ALTCHA_HMAC_KEY,
            "config.insecure_altcha_hmac_key",
        )

    # Database role
    db_role_prefix: str = "canopy_user_"

    # File uploads
    uploads_dir: str = "/tmp/canopy_uploads"

    # Application Features
    allow_self_registration: bool = False

    # Email / SMTP settings
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str = "noreply@canopy.dev"
    smtp_use_tls: bool = False
    smtp_starttls: bool = False

    @field_validator("smtp_host")
    @classmethod
    def validate_smtp_host(cls, v: str, info: ValidationInfo) -> str:
        return _reject_default_in_prod(
            v, info, InsecureDefault.DEFAULT_SMTP_HOST, "config.insecure_smtp_host"
        )

    # Redis
    redis_url: RedisDsn = "redis://redis:6379/0"

    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")


@lru_cache
def get_settings():
    return Settings()
