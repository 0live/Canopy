import pytest
from pydantic import ValidationError
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


class TestGeoImportLimits:
    def test_reads_the_frontend_build_variables(self, monkeypatch):
        monkeypatch.setenv("VITE_GEO_IMPORT_MAX_FILE_SIZE_MB", "100")
        monkeypatch.setenv("VITE_GEO_IMPORT_ZIP_MAX_UNCOMPRESSED_MB", "300")
        settings = Settings(_env_file=None)
        assert settings.geo_import_max_file_size_bytes == 100 * 1024 * 1024
        assert settings.geo_import_zip_max_uncompressed_bytes == 300 * 1024 * 1024

    def test_defaults_match_the_frontend_defaults(self):
        settings = Settings(_env_file=None)
        assert settings.geo_import_max_file_size_mb == 2048
        assert settings.geo_import_zip_max_entries == 1000
        assert settings.geo_import_zip_max_compression_ratio == 200
        assert settings.geo_import_zip_max_uncompressed_mb == 8192

    def test_accepts_the_field_name(self):
        settings = Settings(_env_file=None, geo_import_zip_max_entries=10)
        assert settings.geo_import_zip_max_entries == 10

    @pytest.mark.parametrize(
        "field",
        [
            "geo_import_max_file_size_mb",
            "geo_import_max_concurrent",
            "geo_import_timeout_s",
        ],
    )
    def test_rejects_non_positive_values(self, field):
        with pytest.raises(ValidationError):
            Settings(_env_file=None, **{field: 0})
