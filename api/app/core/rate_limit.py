from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings
from app.core.enums.environment import Environment

limiter = Limiter(
    key_func=get_remote_address,
    enabled=get_settings().env != Environment.TEST,
)
