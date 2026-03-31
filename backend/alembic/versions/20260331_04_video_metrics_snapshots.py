"""Alembic migration for video_metrics_snapshots table"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260331_04_video_metrics_snapshots"
down_revision = "20260331_03_campaign_view_threshold_topic"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "video_metrics_snapshots",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "video_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("videos.id"),
            nullable=False,
        ),
        sa.Column("views", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("likes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("comments", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("shares", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "snapshot_date", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("video_id", "snapshot_date", name="uq_video_metrics_date"),
    )
    op.create_index(
        "ix_video_metrics_snapshots_video_id", "video_metrics_snapshots", ["video_id"]
    )
    op.create_index(
        "ix_video_metrics_snapshots_snapshot_date",
        "video_metrics_snapshots",
        ["snapshot_date"],
    )


def downgrade():
    op.drop_index("ix_video_metrics_snapshots_snapshot_date", "video_metrics_snapshots")
    op.drop_index("ix_video_metrics_snapshots_video_id", "video_metrics_snapshots")
    op.drop_table("video_metrics_snapshots")
