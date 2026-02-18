from app.core.enums.app_parameter import AppParameter
from app.core.messages import MessageService


def validate_password(password: str) -> str:
    """
    Validate password according to NIST guidelines:
    - Minimum length check.
    """
    if len(password) < AppParameter.MIN_PASSWORD_LENGTH:
        raise ValueError(
            MessageService.get_message(
                "validation.password_too_short",
                length=AppParameter.MIN_PASSWORD_LENGTH,
            )
        )

    return password
