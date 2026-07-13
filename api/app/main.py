from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core import models  # noqa: F401
from app.core.config import get_settings
from app.core.database import sessionmanager
from app.core.enums.environment import Environment
from app.core.exceptions.handlers import add_all_exception_handlers
from app.core.middleware.correlation import CorrelationMiddleware
from app.core.messages import MessageService
from app.core.notifications import notificationsRouter
from app.core.notifications.service import get_notification_broadcaster
from app.core.rate_limit import limiter
from app.modules.atlases.endpoints import atlasesRouter
from app.modules.auth.endpoints import authRouter
from app.modules.db_access.endpoints import databaseAccessRouter
from app.modules.geo.endpoints import geoRouter
from app.modules.import_data.endpoints import importDataRouter
from app.modules.maps.endpoints import mapsRouter
from app.modules.setup_root_user.endpoints import setupRootUserRouter
from app.modules.teams.endpoints import teamsRouter
from app.modules.users.endpoints import userRouter


@asynccontextmanager
async def lifespan(app: FastAPI):
    sessionmanager.init(
        str(get_settings().database_url), echo=get_settings().postgres_echo
    )
    MessageService.load_messages()
    yield
    await get_notification_broadcaster().shutdown()
    await sessionmanager.close()


app = FastAPI(
    title="Canopy API",
    summary="Love and Mappyness",
    version="0.0.1",
    lifespan=lifespan,
    root_path="/api",
    default_response_class=ORJSONResponse,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

add_all_exception_handlers(app)

app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    SessionMiddleware,
    secret_key=get_settings().private_key,
    same_site="lax" if get_settings().env == Environment.DEV else "strict",
    https_only=False if get_settings().env == Environment.DEV else True,
)

if get_settings().cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in get_settings().cors_origins],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=get_settings().allowed_hosts,
)

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
app.add_middleware(CorrelationMiddleware)


# Health check endpoint for Docker healthcheck.
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for Docker healthcheck."""
    return {"status": "healthy"}


app.include_router(authRouter)
app.include_router(setupRootUserRouter)
app.include_router(userRouter)
app.include_router(teamsRouter)
app.include_router(atlasesRouter)
app.include_router(mapsRouter)
app.include_router(databaseAccessRouter)
app.include_router(geoRouter)
app.include_router(importDataRouter)
app.include_router(notificationsRouter)
