import pytest
from app.core.config import Settings
from app.core.enums.environment import Environment
from app.core.exceptions import SecurityException

VALID_PROD_SECRETS = {
    "private_key": "a_real_random_secret_key",
    "altcha_hmac_key": "a_real_random_altcha_key",
    "postgres_user": "a_real_db_user",
    "postgres_password": "a_real_random_db_password",
    # Explicit, so a developer's local .env (loaded via `env_file`) can never
    # leak into these tests and trip the smtp_host validator by accident.
    "allow_self_registration": False,
    "smtp_host": "smtp.example.com",
}


class TestPostgresUserValidator:
    def test_rejects_placeholder_in_prod(self):
        with pytest.raises(SecurityException) as exc:
            Settings(**{**VALID_PROD_SECRETS, "env": Environment.PROD, "postgres_user": "To set"})
        assert exc.value.key == "config.insecure_postgres_user"

    def test_allows_placeholder_outside_prod(self):
        settings = Settings(env=Environment.DEV, postgres_user="To set")
        assert settings.postgres_user == "To set"

    def test_allows_custom_value_in_prod(self):
        settings = Settings(env=Environment.PROD, **VALID_PROD_SECRETS)
        assert settings.postgres_user == VALID_PROD_SECRETS["postgres_user"]


class TestPostgresPasswordValidator:
    def test_rejects_placeholder_in_prod(self):
        with pytest.raises(SecurityException) as exc:
            Settings(**{**VALID_PROD_SECRETS, "env": Environment.PROD, "postgres_password": "To set"})
        assert exc.value.key == "config.insecure_postgres_password"

    def test_allows_placeholder_outside_prod(self):
        settings = Settings(env=Environment.DEV, postgres_password="To set")
        assert settings.postgres_password == "To set"

    def test_allows_custom_value_in_prod(self):
        settings = Settings(env=Environment.PROD, **VALID_PROD_SECRETS)
        assert settings.postgres_password == VALID_PROD_SECRETS["postgres_password"]


class TestSmtpHostValidator:
    def test_blocks_boot_when_registration_open_and_mailpit(self):
        overrides = {**VALID_PROD_SECRETS, "allow_self_registration": True, "smtp_host": "mailpit"}
        with pytest.raises(SecurityException) as exc:
            Settings(env=Environment.PROD, **overrides)
        assert exc.value.key == "config.insecure_smtp_host"

    def test_blocks_boot_regardless_of_registration_closed(self):
        overrides = {**VALID_PROD_SECRETS, "allow_self_registration": False, "smtp_host": "mailpit"}
        with pytest.raises(SecurityException) as exc:
            Settings(env=Environment.PROD, **overrides)
        assert exc.value.key == "config.insecure_smtp_host"

    def test_allows_real_smtp_host_regardless_of_registration(self):
        overrides = {**VALID_PROD_SECRETS, "allow_self_registration": True, "smtp_host": "smtp.example.com"}
        settings = Settings(env=Environment.PROD, **overrides)
        assert settings.smtp_host == "smtp.example.com"


class TestAllowedOrigins:
    def test_wildcard_in_dev(self):
        settings = Settings(env=Environment.DEV)
        assert settings.allowed_origins == ["*"]

    def test_derived_from_site_address_in_prod(self):
        settings = Settings(
            env=Environment.PROD,
            **VALID_PROD_SECRETS,
            site_address="maps.example.com",
        )
        assert settings.allowed_origins == ["https://maps.example.com"]

    def test_raises_when_site_address_missing_in_prod(self):
        settings = Settings(env=Environment.PROD, **VALID_PROD_SECRETS, site_address="")
        with pytest.raises(SecurityException) as exc:
            settings.allowed_origins
        assert exc.value.key == "config.site_address_missing"
