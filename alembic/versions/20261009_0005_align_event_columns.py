"""Align events table columns with Event ORM model.

Revision ID: 20261009_0005
Revises: 20261006_0004
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261009_0005"
down_revision: str | Sequence[str] | None = "20261006_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_cols = {col["name"] for col in inspector.get_columns("events")}

    with op.batch_alter_table("events") as batch_op:
        if "company_organization" not in existing_cols:
            batch_op.add_column(
                sa.Column("company_organization", sa.String(length=255), nullable=False, server_default="")
            )
        if "event_type" not in existing_cols:
            batch_op.add_column(
                sa.Column("event_type", sa.String(length=100), nullable=False, server_default="Meetup")
            )
        if "description" not in existing_cols:
            batch_op.add_column(
                sa.Column("description", sa.Text(), nullable=False, server_default="")
            )
        if "event_date" not in existing_cols:
            batch_op.add_column(
                sa.Column("event_date", sa.Date(), nullable=False, server_default=sa.func.current_date())
            )
        if "event_time" not in existing_cols:
            batch_op.add_column(
                sa.Column("event_time", sa.Time(), nullable=False, server_default="10:00:00")
            )
        if "application_url" not in existing_cols:
            batch_op.add_column(
                sa.Column("application_url", sa.String(length=1000), nullable=False, server_default="")
            )

        # Make legacy columns nullable if they exist
        for col_name in ["type", "date", "time", "organizer", "location"]:
            if col_name in existing_cols:
                batch_op.alter_column(col_name, nullable=True)

    # Backfill new columns from legacy columns if data exists
    if "organizer" in existing_cols and "type" in existing_cols:
        op.execute(
            """
            UPDATE events
            SET company_organization = COALESCE(organizer, ''),
                event_type = COALESCE(type, 'Meetup'),
                event_date = COALESCE(date, CURRENT_DATE),
                event_time = COALESCE(time, '10:00:00'),
                description = COALESCE(name, '')
            WHERE company_organization = ''
            """
        )

    # Create indexes if they do not exist
    existing_indexes = {idx["name"] for idx in inspector.get_indexes("events")}
    if "ix_events_company_organization" not in existing_indexes:
        op.create_index("ix_events_company_organization", "events", ["company_organization"], unique=False)
    if "ix_events_event_type" not in existing_indexes:
        op.create_index("ix_events_event_type", "events", ["event_type"], unique=False)
    if "ix_events_mode" not in existing_indexes:
        op.create_index("ix_events_mode", "events", ["mode"], unique=False)
    if "ix_events_event_date" not in existing_indexes:
        op.create_index("ix_events_event_date", "events", ["event_date"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("events") as batch_op:
        batch_op.drop_index("ix_events_event_date")
        batch_op.drop_index("ix_events_mode")
        batch_op.drop_index("ix_events_event_type")
        batch_op.drop_index("ix_events_company_organization")
        batch_op.drop_column("application_url")
        batch_op.drop_column("event_time")
        batch_op.drop_column("event_date")
        batch_op.drop_column("description")
        batch_op.drop_column("event_type")
        batch_op.drop_column("company_organization")
