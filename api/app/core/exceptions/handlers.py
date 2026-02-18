from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.enums.app_parameter import AppParameter
from app.core.exceptions import (
    APIException,
    AuthenticationException,
    DomainException,
    DuplicateEntityException,
    EntityNotFoundException,
    ExternalServiceException,
    NotificationException,
    PermissionDeniedException,
    SecurityException,
)
from app.core.logging_config import logger
from app.core.messages import MessageService


async def duplicate_entity_exception_handler(
    request: Request, exc: DuplicateEntityException
):
    logger.warning("Duplicate entity error: %s", exc.key, extra={"params": exc.params})
    msg = MessageService.get_message(exc.key, **exc.params)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": msg, "key": exc.key, "params": exc.params},
    )


async def entity_not_found_handler(request: Request, exc: EntityNotFoundException):
    logger.info("Entity not found: %s", exc.key, extra={"params": exc.params})
    msg = MessageService.get_message(exc.key, **exc.params)
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": msg, "key": exc.key, "params": exc.params},
    )


async def permission_denied_handler(request: Request, exc: PermissionDeniedException):
    user_id = (
        request.scope.get("user").id
        if "user" in request.scope and hasattr(request.scope["user"], "id")
        else "unknown"
    )
    logger.warning(
        "Permission denied for user %s: %s",
        user_id,
        exc.key,
        extra={"params": exc.params},
    )
    msg = MessageService.get_message(exc.key, **exc.params)
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": msg, "key": exc.key, "params": exc.params},
    )


async def authentication_exception_handler(
    request: Request, exc: AuthenticationException
):
    logger.warning("Authentication failed: %s", exc.key, extra={"params": exc.params})
    msg = MessageService.get_message(exc.key, **exc.params)
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": msg, "key": exc.key, "params": exc.params},
        headers={"WWW-Authenticate": AppParameter.TOKEN_TYPE},
    )


async def domain_exception_handler(request: Request, exc: DomainException):
    logger.warning("Domain exception: %s", exc.key, extra={"params": exc.params})
    msg = MessageService.get_message(exc.key, **exc.params)
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": msg, "key": exc.key, "params": exc.params},
    )


async def request_validation_exception_handler(
    request: Request, exc: RequestValidationError
):
    errors = exc.errors()
    # Remove 'ctx' and 'url' from errors as they may contain non-serializable objects (like Exceptions)
    # or internal URLs that shouldn't be exposed/serialized blindly.
    for error in errors:
        error.pop("ctx", None)
        error.pop("url", None)

    logger.info("Validation error", extra={"errors": errors})
    # Transform Pydantic errors to our standard format
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "key": "VALIDATION_ERROR",
            "params": {"errors": errors},
        },
    )


async def api_exception_handler(request: Request, exc: APIException):
    # Fallback for generic exceptions. Log with traceback.
    logger.error("Internal Server Error: %s", exc.key, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


async def security_exception_handler(request: Request, exc: SecurityException):
    logger.critical("Security error: %s", exc.key, extra={"params": exc.params})
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


async def notification_exception_handler(request: Request, exc: NotificationException):
    logger.error("Notification error: %s", exc.key, extra={"params": exc.params})
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


async def external_service_exception_handler(
    request: Request, exc: ExternalServiceException
):
    logger.error("External Service Error: %s", exc.key, extra={"params": exc.params})
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={"detail": "External service error"},
    )


def add_all_exception_handlers(app):
    app.add_exception_handler(
        DuplicateEntityException, duplicate_entity_exception_handler
    )
    app.add_exception_handler(EntityNotFoundException, entity_not_found_handler)
    app.add_exception_handler(PermissionDeniedException, permission_denied_handler)
    app.add_exception_handler(AuthenticationException, authentication_exception_handler)
    app.add_exception_handler(DomainException, domain_exception_handler)
    app.add_exception_handler(SecurityException, security_exception_handler)
    app.add_exception_handler(NotificationException, notification_exception_handler)
    app.add_exception_handler(
        ExternalServiceException, external_service_exception_handler
    )
    app.add_exception_handler(
        RequestValidationError, request_validation_exception_handler
    )
    app.add_exception_handler(APIException, api_exception_handler)
