"""Alembic migration for channel_metrics_snapshots table"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260331_05_channel_metrics_snapshots"
down_revision = "20260331_04_video_metrics_snapshots"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "channel_metrics_snapshots",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "channel_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("target_channels.id"),
            nullable=False,
        ),
        sa.Column("followers", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("following", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("likes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("video_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_views", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "snapshot_date", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint(
            "channel_id", "snapshot_date", name="uq_channel_metrics_date"
        ),
    )
    op.create_index(
        "ix_channel_metrics_snapshots_channel_id",
        "channel_metrics_snapshots",
        ["channel_id"],
    )
    op.create_index(
        "ix_channel_metrics_snapshots_snapshot_date",
        "channel_metrics_snapshots",
        ["snapshot_date"],
    )


def downgrade():
    op.drop_index(
        "ix_channel_metrics_snapshots_snapshot_date", "channel_metrics_snapshots"
    )
    op.drop_index(
        "ix_channel_metrics_snapshots_channel_id", "channel_metrics_snapshots"
    )
    op.drop_table("channel_metrics_snapshots")
