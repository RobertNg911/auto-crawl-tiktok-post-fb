"""Add auto_post and related fields to facebook_pages.

Revision ID: 20260331_06
Revises: 20260331_05
Create Date: 2026-03-31 12:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260331_06"
down_revision = "20260331_05"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "facebook_pages",
        sa.Column("auto_post", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "facebook_pages",
        sa.Column("auto_comment", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "facebook_pages",
        sa.Column("auto_inbox", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "facebook_pages",
        sa.Column("caption_prompt", sa.String(), nullable=True),
    )
    op.add_column(
        "facebook_pages",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade():
    op.drop_column("facebook_pages", "auto_post")
    op.drop_column("facebook_pages", "auto_comment")
    op.drop_column("facebook_pages", "auto_inbox")
    op.drop_column("facebook_pages", "caption_prompt")
    op.drop_column("facebook_pages", "is_deleted")
