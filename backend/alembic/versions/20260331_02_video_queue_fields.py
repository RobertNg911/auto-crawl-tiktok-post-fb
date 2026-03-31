"""Add video queue fields

Revision ID: 20260331_02
Revises: 20260331_01
Create Date: 2026-03-31 10:30:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260331_02"
down_revision: Union[str, None] = "20260331_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("videos", sa.Column("thumbnail_url", sa.String(500), nullable=True))
    op.add_column(
        "videos", sa.Column("views", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column(
        "videos", sa.Column("likes", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column(
        "videos",
        sa.Column("comments_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "videos",
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "videos",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
    )

    op.create_index("idx_videos_priority", "videos", ["priority"])
    op.create_index("idx_videos_status", "videos", ["status"])


def downgrade() -> None:
    op.drop_index("idx_videos_status", table_name="videos")
    op.drop_index("idx_videos_priority", table_name="videos")
    op.drop_column("videos", "is_deleted")
    op.drop_column("videos", "priority")
    op.drop_column("videos", "comments_count")
    op.drop_column("videos", "likes")
    op.drop_column("videos", "views")
    op.drop_column("videos", "thumbnail_url")
