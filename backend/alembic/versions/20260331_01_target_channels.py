"""Add target_channels table

Revision ID: 20260331_01
Revises: 20260329_07
Create Date: 2026-03-31 10:00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260331_01"
down_revision: Union[str, None] = "20260329_07"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "target_channels",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "channel_id", sa.String(255), nullable=False, unique=True, index=True
        ),
        sa.Column("username", sa.String(100), nullable=False, index=True),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("topic", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("idx_target_channels_status", "target_channels", ["status"])
    op.create_index("idx_target_channels_username", "target_channels", ["username"])


def downgrade() -> None:
    op.drop_index("idx_target_channels_username", table_name="target_channels")
    op.drop_index("idx_target_channels_status", table_name="target_channels")
    op.drop_table("target_channels")
