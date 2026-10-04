"""Setup and verify administrator user in PostgreSQL."""

import asyncio
import uuid
import asyncpg
from backend.core.config import settings
from backend.core.security import hash_password


async def setup_admin():
    conn = await asyncpg.connect(
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        database=settings.POSTGRES_DB,
    )

    # 1. Add columns to users table if missing
    await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';")
    await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active';")

    # 2. Add forum tables if missing
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS forum_threads (
            id SERIAL PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS forum_posts (
            id SERIAL PRIMARY KEY,
            thread_id INTEGER NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
            author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS forum_bans (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    # 3. Create or update admin user
    pw_hash = hash_password("password")
    admin_row = await conn.fetchrow(
        "SELECT id FROM users WHERE username = 'admin' OR email = 'admin@opensourceassist.dev';"
    )
    if admin_row:
        await conn.execute(
            "UPDATE users SET username = 'admin', email = 'admin@opensourceassist.dev', password_hash = $1, role = 'admin', account_status = 'active', is_active = true WHERE id = $2;",
            pw_hash,
            admin_row["id"],
        )
        print("Updated existing user to admin (username: admin, password: password, role: admin)")
    else:
        admin_id = uuid.uuid4()
        await conn.execute(
            "INSERT INTO users (id, email, username, password_hash, role, account_status, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7);",
            admin_id,
            "admin@opensourceassist.dev",
            "admin",
            pw_hash,
            "admin",
            "active",
            True,
        )
        print("Created new admin user (username: admin, email: admin@opensourceassist.dev, password: password, role: admin)")

    await conn.close()


if __name__ == "__main__":
    asyncio.run(setup_admin())
