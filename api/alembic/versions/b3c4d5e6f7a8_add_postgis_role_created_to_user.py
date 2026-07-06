"""add_postgis_role_created_to_user

Revision ID: b3c4d5e6f7a8
Revises: a86774f9c343
Create Date: 2026-03-31 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, Sequence[str], None] = "a86774f9c343"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add postgis_role_created boolean column to user table."""
    op.add_column(
        "user",
        sa.Column(
            "postgis_role_created",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        schema="app_data",
    )


def downgrade() -> None:
    """Remove postgis_role_created column from user table."""
    op.drop_column("user", "postgis_role_created", schema="app_data")
