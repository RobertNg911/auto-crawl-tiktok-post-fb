"""Add view_threshold and topic to Campaign

Revision ID: 20260331_03
Revises: 20260331_02
Create Date: 2026-03-31 12:00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260331_03"
down_revision: Union[str, None] = "20260331_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("campaigns", sa.Column("topic", sa.String(100), nullable=True))
    op.add_column(
        "campaigns",
        sa.Column("view_threshold", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("idx_campaigns_topic", "campaigns", ["topic"])


def downgrade() -> None:
    op.drop_index("idx_campaigns_topic", table_name="campaigns")
    op.drop_column("campaigns", "view_threshold")
    op.drop_column("campaigns", "topic")
