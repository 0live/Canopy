import base64
import hashlib
import hmac
import os

_ITERATIONS = 4096


def _derive_scram_keys(password: str, salt: bytes) -> tuple[bytes, bytes]:
    """Derive StoredKey and ServerKey via PBKDF2-HMAC-SHA256."""
    salted = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _ITERATIONS)
    client_key = hmac.new(salted, b"Client Key", hashlib.sha256).digest()
    stored_key = hashlib.sha256(client_key).digest()
    server_key = hmac.new(salted, b"Server Key", hashlib.sha256).digest()
    return stored_key, server_key


def _format_verifier(salt: bytes, stored_key: bytes, server_key: bytes) -> str:
    """Format the SCRAM-SHA-256 verifier string for PostgreSQL."""
    salt_b64 = base64.b64encode(salt).decode("ascii")
    stored_b64 = base64.b64encode(stored_key).decode("ascii")
    server_b64 = base64.b64encode(server_key).decode("ascii")
    return f"SCRAM-SHA-256${_ITERATIONS}:{salt_b64}${stored_b64}:{server_b64}"


def generate_scram_sha256_verifier(password: str) -> str:
    """
    Generate a PostgreSQL-compatible SCRAM-SHA-256 verifier string.

    The result can be passed directly to CREATE ROLE / ALTER ROLE PASSWORD
    so the plaintext password never appears in PostgreSQL logs.
    Requires password_encryption = scram-sha-256 on the PostgreSQL server
    (default since PostgreSQL 14).
    """
    salt = os.urandom(16)
    stored_key, server_key = _derive_scram_keys(password, salt)
    return _format_verifier(salt, stored_key, server_key)
