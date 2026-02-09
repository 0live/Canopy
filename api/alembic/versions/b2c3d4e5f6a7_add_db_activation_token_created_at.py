"""add_db_activation_token_created_at

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-08 23:55:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add db_activation_token_created_at column to user table."""
    op.add_column(
        "user",
        sa.Column("db_activation_token_created_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    """Remove db_activation_token_created_at column from user table."""
    op.drop_column("user", "db_activation_token_created_at")
