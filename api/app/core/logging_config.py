import logging
import sys

from pythonjsonlogger.jsonlogger import JsonFormatter

from app.core.config import get_settings
from app.core.enums.environment import Environment


class _CorrelationFilter(logging.Filter):
    """Inject correlation_id from context into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        from app.core.middleware.correlation import correlation_id_ctx

        record.correlation_id = correlation_id_ctx.get(None)
        return True


def _build_handler(log_level: int, use_json: bool) -> logging.Handler:
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)
    handler.addFilter(_CorrelationFilter())

    if use_json:
        fmt = JsonFormatter(
            fmt="%(asctime)s %(name)s %(levelname)s %(message)s %(correlation_id)s",
            rename_fields={"asctime": "timestamp", "levelname": "level", "name": "logger"},
        )
    else:
        fmt = logging.Formatter(
            "%(asctime)s [%(correlation_id)s] %(name)s %(levelname)s - %(message)s"
        )

    handler.setFormatter(fmt)
    return handler


def setup_logging() -> None:
    settings = get_settings()
    is_dev = settings.env == Environment.DEV
    log_level = logging.DEBUG if is_dev else logging.INFO

    root = logging.getLogger("canopy")
    root.setLevel(log_level)

    if not root.handlers:
        root.addHandler(_build_handler(log_level, use_json=not is_dev))


def get_logger(name: str) -> logging.Logger:
    """Return a child logger under the 'canopy' namespace."""
    return logging.getLogger(f"canopy.{name}")


setup_logging()
