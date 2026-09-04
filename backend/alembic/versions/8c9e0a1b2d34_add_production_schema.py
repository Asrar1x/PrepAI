"""add production schema (modules 1, 2, 6, 7, 8, 9, 10)

Revision ID: 8c9e0a1b2d34
Revises: 147beed85d57
Create Date: 2026-09-03 19:45:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = "8c9e0a1b2d34"
down_revision: Union[str, Sequence[str], None] = "147beed85d57"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Module 1 — Company patterns (doc §17 tables 7-12 group, table: company_patterns)
    op.create_table(
        "company_patterns",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("industry", sa.String(), nullable=True),
        sa.Column("hiring_signal", sa.String(), nullable=True, server_default="active"),
        sa.Column("salary_range", sa.String(), nullable=True),
        sa.Column("assessment_summary", sa.String(), nullable=True),
        sa.Column("sections", JSONB(), nullable=True),
        sa.Column("timings", JSONB(), nullable=True),
        sa.Column("distribution", JSONB(), nullable=True),
        sa.Column("negative_marking", JSONB(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("true")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_company_patterns_slug"), "company_patterns", ["slug"], unique=True)

    # Module 1 — Roles (doc §17)
    op.create_table(
        "roles",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False, index=True),
        sa.Column("summary", sa.String(), nullable=True),
        sa.Column("salary_range", sa.String(), nullable=True),
        sa.Column("difficulty", sa.String(), nullable=True),
        sa.Column("skills", JSONB(), nullable=True),
        sa.Column("interview_rounds", sa.Integer(), nullable=True, server_default="3"),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("true")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_roles_slug"), "roles", ["slug"], unique=True)

    # Module 1 — Study plans (doc §17 Table 6)
    op.create_table(
        "study_plans",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("role_slug", sa.String(), nullable=False),
        sa.Column("company_slug", sa.String(), nullable=True),
        sa.Column("plan", JSONB(), nullable=True),
        sa.Column("progress", sa.Float(), nullable=True, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_study_plans_user_id"), "study_plans", ["user_id"], unique=False)

    # Module 9 — Badges + user_badges
    op.create_table(
        "badges",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("icon", sa.String(), nullable=True),
        sa.Column("criteria", JSONB(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_badges_slug"), "badges", ["slug"], unique=True)

    op.create_table(
        "user_badges",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("badge_id", sa.UUID(), nullable=False),
        sa.Column("awarded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["badge_id"], ["badges.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),
    )
    op.create_index(op.f("ix_user_badges_user_id"), "user_badges", ["user_id"], unique=False)

    # Module 8 — In-app notifications
    op.create_table(
        "notifications",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("type", sa.String(), nullable=False, index=True),
        sa.Column("category", sa.String(), nullable=False, server_default="system"),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.String(), nullable=True),
        sa.Column("payload", JSONB(), nullable=True),
        sa.Column("href", sa.String(), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, index=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False)

    # Module 8 — Notification preferences (one row per user)
    op.create_table(
        "user_notification_prefs",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("prefs", JSONB(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )

    # Module 9 — Daily quests
    op.create_table(
        "daily_quests",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False, index=True),
        sa.Column("kind", sa.String(), nullable=False, server_default="aptitude"),
        sa.Column("target", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("completed", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.Column("metadata_json", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "date", name="uq_user_daily_quest"),
    )

    # Module 10 — Engagement events
    op.create_table(
        "engagement_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False, index=True),
        sa.Column("event_type", sa.String(), nullable=False, index=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True, index=True),
        sa.Column("payload", JSONB(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Module 9 — Leaderboard snapshots
    op.create_table(
        "leaderboard_snapshots",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("scope", sa.String(), nullable=False, server_default="all"),
        sa.Column("date", sa.Date(), nullable=False, index=True),
        sa.Column("rankings", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # Module 10 — Placement outcomes (Phase 2 data)
    op.create_table(
        "placement_outcomes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False, index=True),
        sa.Column("company_slug", sa.String(), nullable=False, index=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("package_lpa", sa.Float(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Extend users — notification_prefs snapshot lives on the user row
    op.add_column("users", sa.Column("notification_prefs", JSONB(), nullable=True))
    # Extend resumes — add storage backend (local vs r2)
    op.add_column("resumes", sa.Column("storage_backend", sa.String(), nullable=True, server_default="local"))
    op.add_column("resumes", sa.Column("parse_status", sa.String(), nullable=True, server_default="pending"))


def downgrade() -> None:
    op.drop_column("resumes", "parse_status")
    op.drop_column("resumes", "storage_backend")
    op.drop_column("users", "notification_prefs")
    op.drop_table("placement_outcomes")
    op.drop_table("leaderboard_snapshots")
    op.drop_table("engagement_events")
    op.drop_table("daily_quests")
    op.drop_table("user_notification_prefs")
    op.drop_table("notifications")
    op.drop_table("user_badges")
    op.drop_table("badges")
    op.drop_table("study_plans")
    op.drop_table("roles")
    op.drop_table("company_patterns")
