from enum import Enum


class AppParameters(str, Enum):
    MIN_PASSWORD_LENGTH = 12
    TOKEN_LENGTH = 32
    TOKEN_TYPE = "bearer"
    MIN_PASSWORD_LENGTH = "refresh_token"
    DB_ROLE_PREFIX = "canopy_user_"
    REDIS_USER_CHANNEL_PREFIX = "user:"
