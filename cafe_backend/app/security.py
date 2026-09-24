import hashlib
import secrets


TOKEN_BYTES = 32


def generate_table_token() -> str:
    """
    Generate a cryptographically secure random token.

    32 random bytes gives 256 bits of entropy.
    """
    return secrets.token_urlsafe(TOKEN_BYTES)


def hash_table_token(raw_token: str) -> str:
    """
    Hash the raw table token using SHA-256.

    The raw token must never be stored in MongoDB.
    """
    return hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()