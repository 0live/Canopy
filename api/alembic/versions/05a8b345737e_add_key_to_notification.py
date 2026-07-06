"""add_key_to_notification

Revision ID: 05a8b345737e
Revises: 987372104469
Create Date: 2026-03-29 20:00:32.287406

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "05a8b345737e"
down_revision: Union[str, Sequence[str], None] = "987372104469"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    notification_key_enum = sa.Enum(
        "ROLES_CHANGED", "DB_ACCESS_GIVEN", name="notificationkey"
    )
    notification_key_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "notification",
        sa.Column(
            "key",
            sa.Enum("ROLES_CHANGED", "DB_ACCESS_GIVEN", name="notificationkey"),
            nullable=True,
        ),
        schema="app_data",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("notification", "key", schema="app_data")
    sa.Enum(name="notificationkey").drop(op.get_bind(), checkfirst=True)
