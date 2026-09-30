"""Add persisted user roles and account moderation status."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260928_0002"
down_revision: str | Sequence[str] | None = "20260923_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("role", sa.String(length=20), nullable=False, server_default="user")
        )
        batch_op.add_column(
            sa.Column(
                "account_status",
                sa.String(length=20),
                nullable=False,
                server_default="active",
            )
        )
        batch_op.create_check_constraint("ck_users_role", "role IN ('user', 'admin')")
        batch_op.create_check_constraint(
            "ck_users_account_status",
            "account_status IN ('active', 'suspended', 'banned')",
        )


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("ck_users_account_status", type_="check")
        batch_op.drop_constraint("ck_users_role", type_="check")
        batch_op.drop_column("account_status")
        batch_op.drop_column("role")