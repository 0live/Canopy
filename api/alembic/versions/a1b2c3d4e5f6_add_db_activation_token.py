"""add_db_activation_token

Revision ID: a1b2c3d4e5f6
Revises: fc1ddb77ce62
Create Date: 2026-02-08 22:05:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "fc1ddb77ce62"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add db_activation_token column to user table."""
    op.add_column("user", sa.Column("db_activation_token", sa.String(), nullable=True))


def downgrade() -> None:
    """Remove db_activation_token column from user table."""
    op.drop_column("user", "db_activation_token")
