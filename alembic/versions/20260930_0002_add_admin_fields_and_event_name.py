"""Add persistent admin fields and public event names."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260930_0002"
down_revision: str | Sequence[str] | None = "20260923_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(bind: sa.Connection, name: str) -> bool:
    return name in sa.inspect(bind).get_table_names()


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    user_columns = {col["name"] for col in inspector.get_columns("users")} if _table_exists(bind, "users") else set()
    if "role" not in user_columns:
        op.add_column("users", sa.Column("role", sa.String(length=20), nullable=False, server_default="user"))
    if "account_status" not in user_columns:
        op.add_column("users", sa.Column("account_status", sa.String(length=20), nullable=False, server_default="active"))

    if not _table_exists(bind, "events"):
        op.create_table(
            "events",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=255), nullable=False, server_default="Untitled Event"),
            sa.Column("company_organization", sa.String(length=255), nullable=False),
            sa.Column("event_type", sa.String(length=100), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("mode", sa.String(length=50), nullable=False),
            sa.Column("location", sa.String(length=500), nullable=True),
            sa.Column("event_date", sa.Date(), nullable=False),
            sa.Column("event_time", sa.Time(), nullable=False),
            sa.Column("application_url", sa.String(length=1000), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_events_name", "events", ["name"], unique=False)
        op.create_index("ix_events_company_organization", "events", ["company_organization"], unique=False)
        op.create_index("ix_events_event_type", "events", ["event_type"], unique=False)
        op.create_index("ix_events_mode", "events", ["mode"], unique=False)
        op.create_index("ix_events_event_date", "events", ["event_date"], unique=False)
    else:
        event_columns = {col["name"] for col in inspector.get_columns("events")}
        if "name" not in event_columns:
            op.add_column("events", sa.Column("name", sa.String(length=255), nullable=False, server_default="Untitled Event"))


def downgrade() -> None:
    bind = op.get_bind()
    if _table_exists(bind, "events"):
        event_columns = {col["name"] for col in sa.inspect(bind).get_columns("events")}
        if "name" in event_columns:
            op.drop_column("events", "name")
    if _table_exists(bind, "users"):
        user_columns = {col["name"] for col in sa.inspect(bind).get_columns("users")}
        if "account_status" in user_columns:
            op.drop_column("users", "account_status")
        if "role" in user_columns:
            op.drop_column("users", "role")
