"""add users.last_active_date for streak logic

Revision ID: 5b8c9d0e1f2a
Revises: 3a7b1c2d4e5f
Create Date: 2026-09-03 20:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "5b8c9d0e1f2a"
down_revision = "3a7b1c2d4e5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("last_active_date", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_active_date")
