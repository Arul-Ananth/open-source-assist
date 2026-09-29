"""Add persistent administrator role and account moderation status."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260928_0002"
down_revision: str | Sequence[str] | None = "20260923_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("role", sa.String(length=20), nullable=False, server_default="user"),
    )
    op.add_column(
        "users",
        sa.Column("account_status", sa.String(length=20), nullable=False, server_default="active"),
    )


def downgrade() -> None:
    op.drop_column("users", "account_status")
    op.drop_column("users", "role")
