import base64
import hashlib
import hmac
import re
from unittest.mock import patch

import pytest

from app.core.scram import generate_scram_sha256_verifier

_VERIFIER_PATTERN = re.compile(
    r"^SCRAM-SHA-256\$\d+:[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$"
)
_FIXED_SALT = b"\x00" * 16


class TestGenerateScramSha256Verifier:
    def test_output_format(self):
        result = generate_scram_sha256_verifier("somepassword")
        assert _VERIFIER_PATTERN.match(result), f"Unexpected format: {result}"

    def test_iteration_count(self):
        result = generate_scram_sha256_verifier("somepassword")
        iterations = int(result.split("$")[1].split(":")[0])
        assert iterations == 4096

    def test_uniqueness(self):
        result1 = generate_scram_sha256_verifier("somepassword")
        result2 = generate_scram_sha256_verifier("somepassword")
        assert result1 != result2

    def test_determinism_with_fixed_salt(self):
        with patch("app.core.scram.os.urandom", return_value=_FIXED_SALT):
            result1 = generate_scram_sha256_verifier("somepassword")
            result2 = generate_scram_sha256_verifier("somepassword")
        assert result1 == result2

    def test_round_trip(self):
        with patch("app.core.scram.os.urandom", return_value=_FIXED_SALT):
            result = generate_scram_sha256_verifier("testpassword")

        salted = hashlib.pbkdf2_hmac("sha256", b"testpassword", _FIXED_SALT, 4096)
        client_key = hmac.new(salted, b"Client Key", hashlib.sha256).digest()
        stored_key = hashlib.sha256(client_key).digest()
        server_key = hmac.new(salted, b"Server Key", hashlib.sha256).digest()
        salt_b64 = base64.b64encode(_FIXED_SALT).decode("ascii")
        stored_b64 = base64.b64encode(stored_key).decode("ascii")
        server_b64 = base64.b64encode(server_key).decode("ascii")
        expected = f"SCRAM-SHA-256$4096:{salt_b64}${stored_b64}:{server_b64}"

        assert result == expected

    def test_unicode_password(self):
        result = generate_scram_sha256_verifier("pässwörd123!")
        assert _VERIFIER_PATTERN.match(result)
