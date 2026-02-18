from app.core.enums.app_parameters import AppParameters
from app.core.messages import MessageService


def validate_password(password: str) -> str:
    """
    Validate password according to NIST guidelines:
    - Minimum length check.
    """
    if len(password) < AppParameters.MIN_PASSWORD_LENGTH:
        raise ValueError(
            MessageService.get_message(
                "validation.password_too_short",
                length=AppParameters.MIN_PASSWORD_LENGTH,
            )
        )

    return password
