import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

CORRELATION_ID_HEADER = "X-Correlation-ID"

correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id", default="")


class CorrelationMiddleware(BaseHTTPMiddleware):
    """Attach a correlation ID to every request for end-to-end log tracing."""

    async def dispatch(self, request: Request, call_next) -> Response:
        correlation_id = request.headers.get(CORRELATION_ID_HEADER) or str(uuid.uuid4())
        token = correlation_id_ctx.set(correlation_id)

        try:
            response = await call_next(request)
        finally:
            correlation_id_ctx.reset(token)

        response.headers[CORRELATION_ID_HEADER] = correlation_id
        return response
