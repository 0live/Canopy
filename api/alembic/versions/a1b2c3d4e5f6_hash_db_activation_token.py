"""hash_db_activation_token

Revision ID: a1b2c3d4e5f6
Revises: 05a8b345737e
Create Date: 2026-03-31 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "05a8b345737e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename db_activation_token to db_activation_token_hash."""
    op.alter_column(
        "user",
        "db_activation_token",
        new_column_name="db_activation_token_hash",
        schema="app_data",
    )


def downgrade() -> None:
    """Revert column rename (enum value cannot be removed in PostgreSQL)."""
    op.alter_column(
        "user",
        "db_activation_token_hash",
        new_column_name="db_activation_token",
        schema="app_data",
    )
