"""add question_bank.created_at + indices for category+role+company matching

Revision ID: 3a7b1c2d4e5f
Revises: 8c9e0a1b2d34
Create Date: 2026-09-03 19:55:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "3a7b1c2d4e5f"
down_revision = "8c9e0a1b2d34"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "question_bank",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_question_bank_category_role",
        "question_bank",
        ["category", "job_role", "difficulty"],
    )
    op.create_index(
        "ix_question_bank_times_used",
        "question_bank",
        ["times_used"],
    )


def downgrade() -> None:
    op.drop_index("ix_question_bank_times_used", table_name="question_bank")
    op.drop_index("ix_question_bank_category_role", table_name="question_bank")
    op.drop_column("question_bank", "created_at")
