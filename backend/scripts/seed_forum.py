"""Seed realistic community discussions and forum posts into PostgreSQL."""

import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, text

from backend.core.database import SessionLocal, engine
from backend.models.forum_model import ForumPost, ForumThread
from backend.models.user_model import User


async def ensure_schema_columns():
    """Ensure newly added columns exist in existing PostgreSQL tables."""
    queries = [
        "ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';",
        "ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;",
        "ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;",
        "ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS is_solved BOOLEAN DEFAULT false;",
        "ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS accepted_answer_id INTEGER;",
        "ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();",
        "ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS is_opening_post BOOLEAN DEFAULT false;",
        "ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;",
        "ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;",
        "CREATE INDEX IF NOT EXISTS ix_forum_posts_thread_created ON forum_posts(thread_id, created_at);",
        "CREATE INDEX IF NOT EXISTS ix_forum_threads_category ON forum_threads(category);",
        "CREATE INDEX IF NOT EXISTS ix_forum_threads_last_activity ON forum_threads(last_activity_at);",
    ]
    async with engine.begin() as conn:
        for q in queries:
            try:
                await conn.execute(text(q))
            except Exception as e:
                print(f"Schema update note: {e}")


DUMMY_THREADS = [
    {
        "title": "How to resolve PostgreSQL SSL connection error in Docker Compose?",
        "category": "q-and-a",
        "time_offset_hours": 36,
        "content": (
            "Hi everyone, when running `docker compose up -d`, my FastAPI backend container crashes with:\n"
            "```text\n"
            "asyncpg.exceptions.InvalidPasswordError: password authentication failed for user 'postgres'\n"
            "```\n"
            "Here is my database service definition in `docker-compose.yaml`:\n"
            "```yaml\n"
            "services:\n"
            "  db:\n"
            "    image: postgres:15-alpine\n"
            "    environment:\n"
            "      POSTGRES_USER: postgres\n"
            "      POSTGRES_PASSWORD: secretpassword\n"
            "      POSTGRES_DB: openassist\n"
            "```\n"
            "Is there any environment variable missing for SSL mode?"
        ),
        "replies": [
            {
                "time_offset_hours": 34,
                "upvotes": 8,
                "is_solution": True,
                "content": (
                    "Make sure your `DATABASE_URL` in `.env` explicitly disables SSL for local dockerized networking:\n"
                    "```bash\n"
                    "DATABASE_URL=postgresql+asyncpg://postgres:secretpassword@db:5432/openassist?ssl=disable\n"
                    "```\n"
                    "Also run `docker compose down -v` once to clear stale PostgreSQL volume credentials if you previously started it with default passwords."
                ),
            },
            {
                "time_offset_hours": 30,
                "upvotes": 3,
                "is_solution": False,
                "content": "Confirming that clearing the docker volume solved it for me! Thanks a lot.",
            },
        ],
    },
    {
        "title": "Good First Issues: Contributing to FastAPI and Pydantic v2 validation",
        "category": "good-first-issue",
        "time_offset_hours": 24,
        "content": (
            "Hey contributors! For anyone looking to make their first pull request this week, "
            "we have cataloged 3 beginner-friendly tasks:\n\n"
            "1. **Documentation Typo & Sample Code Update**:\n"
            "   Add interactive curl samples to `/docs/tutorial/body.md`.\n"
            "2. **Pydantic Model Schema Validation**:\n"
            "   Ensure `Optional[UUID] = None` default arguments are specified across route schemas.\n"
            "3. **Unit Test Coverage**:\n"
            "   Add async test assertions verifying HTTP 422 unprocessable entity responses.\n\n"
            "Comment below with which area you would like to tackle and I can help review your atomic PR!"
        ),
        "replies": [
            {
                "time_offset_hours": 20,
                "upvotes": 5,
                "is_solution": False,
                "content": (
                    "I'd love to take on task #2 (Pydantic model schema validation)! "
                    "I'll fork the repository and open a draft PR shortly."
                ),
            },
            {
                "time_offset_hours": 18,
                "upvotes": 2,
                "is_solution": False,
                "content": (
                    "Awesome @contributor! Ping me on this thread if you have any questions about pytest fixtures."
                ),
            },
        ],
    },
    {
        "title": "RFC: Vector Search with Qdrant and FastEmbed ONNX local embeddings",
        "category": "architecture",
        "time_offset_hours": 12,
        "content": (
            "We recently moved semantic repository search from external API calls to a self-hosted "
            "**Qdrant Vector Database** powered by `BAAI/bge-small-en-v1.5` embeddings running in-process via ONNX.\n\n"
            "**Key Improvements Observed:**\n"
            "- **Query Latency**: Search requests dropped from ~650ms (external OpenAI API) to ~28ms local HNSW search.\n"
            "- **Zero API Cost**: 100% offline generation with quantized 384-dimensional vectors.\n"
            "- **Filtering**: Hybrid lexical and inverted index filters for `stars`, `language`, and `topics`.\n\n"
            "What do you think of this architecture? Any suggestions for indexing larger README contents?"
        ),
        "replies": [
            {
                "time_offset_hours": 8,
                "upvotes": 6,
                "is_solution": False,
                "content": (
                    "Great design choice! For README indexing, consider chunking by markdown headers (`## Section`) "
                    "with a small 50-token sliding window overlap so deep architectural sections aren't truncated by token limits."
                ),
            },
        ],
    },
    {
        "title": "Showcase: First PR merged into Upstream Open Source! 🎉",
        "category": "showcase",
        "time_offset_hours": 6,
        "content": (
            "Just wanted to share a milestone with the community — my first pull request was merged into an upstream library today!\n\n"
            "Following the Open Source Assist roadmap, I started by setting up local pre-commit hooks, "
            "reproducing an open issue, and writing unit tests before touching code.\n\n"
            "Special thanks to the maintainers for constructive review feedback!"
        ),
        "replies": [
            {
                "time_offset_hours": 4,
                "upvotes": 9,
                "is_solution": False,
                "content": "Congratulations! 🚀 Huge achievement. That first merged PR is always the hardest — onward to the next one!",
            },
            {
                "time_offset_hours": 2,
                "upvotes": 4,
                "is_solution": False,
                "content": "Inspiring! Could you share a link to the merged PR so others can see how the atomic commits were formatted?",
            },
        ],
    },
    {
        "title": "Best practices for writing conventional commit messages",
        "category": "general",
        "time_offset_hours": 48,
        "content": (
            "A quick reminder for maintainers and contributors on standard conventional commit conventions:\n\n"
            "- `feat(scope): add new feature`\n"
            "- `fix(scope): resolve bug or edge case`\n"
            "- `docs(scope): update README or API documentation`\n"
            "- `refactor(scope): internal code cleanup without changing behavior`\n"
            "- `test(scope): add pytest or vitest suites`\n\n"
            "Keeping commit subjects under 72 characters and writing in imperative tense makes git blame and automated changelogs much cleaner."
        ),
        "replies": [
            {
                "time_offset_hours": 40,
                "upvotes": 7,
                "is_solution": False,
                "content": (
                    "Highly agree! I also recommend setting up a local git alias:\n"
                    "```bash\n"
                    "git config --global alias.cm 'commit -m'\n"
                    "```"
                ),
            },
        ],
    },
]


async def seed():
    print("Ensuring database schema columns...")
    await ensure_schema_columns()

    async with SessionLocal() as session:
        # Load existing users to act as discussion authors
        users = (await session.scalars(select(User).limit(5))).all()
        if not users:
            print("No users found in database. Please run migrations or create a user first.")
            return

        author_a = users[0]
        author_b = users[1] if len(users) > 1 else users[0]
        author_c = users[2] if len(users) > 2 else users[0]

        now = datetime.now(timezone.utc)

        for item in DUMMY_THREADS:
            existing = await session.scalar(
                select(ForumThread).where(ForumThread.title == item["title"])
            )
            if existing:
                print(f"Discussion already exists: '{item['title']}'")
                continue

            created_at = now - timedelta(hours=item["time_offset_hours"])
            last_activity = created_at

            thread = ForumThread(
                title=item["title"],
                author_id=author_a.id,
                category=item["category"],
                reply_count=len(item["replies"]),
                views_count=18 + len(item["replies"]) * 7,
                is_solved=False,
                created_at=created_at,
                last_activity_at=created_at,
            )
            session.add(thread)
            await session.flush()

            # Add opening post
            opening_post = ForumPost(
                thread_id=thread.id,
                author_id=author_a.id,
                content=item["content"],
                is_opening_post=True,
                upvotes=4,
                created_at=created_at,
            )
            session.add(opening_post)
            await session.flush()

            accepted_id = None
            # Add replies
            for r_idx, rep in enumerate(item["replies"]):
                r_author = author_b if r_idx % 2 == 0 else author_c
                r_time = now - timedelta(hours=rep["time_offset_hours"])
                if r_time > last_activity:
                    last_activity = r_time

                reply_post = ForumPost(
                    thread_id=thread.id,
                    author_id=r_author.id,
                    content=rep["content"],
                    is_opening_post=False,
                    upvotes=rep["upvotes"],
                    created_at=r_time,
                )
                session.add(reply_post)
                await session.flush()

                if rep.get("is_solution"):
                    accepted_id = reply_post.id

            thread.last_activity_at = last_activity
            if accepted_id:
                thread.is_solved = True
                thread.accepted_answer_id = accepted_id

            safe_title = thread.title.encode("ascii", "replace").decode("ascii")
            print(f"Added discussion '{safe_title}' ({len(item['replies'])} replies, category: {thread.category})")

        await session.commit()
    print("Forum seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
