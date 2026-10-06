"""Tests for modernized forum service and endpoints."""

import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from backend.core.database import Base, get_db
from backend.core.jwt import create_access_token
from backend.core.security import hash_password
from backend.main import app
from backend.models.user_model import User


@pytest_asyncio.fixture
async def forum_db():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    session = session_factory()

    user_a = User(
        id=uuid.uuid4(),
        email="author@example.com",
        username="author_user",
        password_hash=hash_password("fakehash"),
        role="user",
        account_status="active",
        is_active=True,
    )
    user_b = User(
        id=uuid.uuid4(),
        email="responder@example.com",
        username="responder_user",
        password_hash=hash_password("fakehash"),
        role="user",
        account_status="active",
        is_active=True,
    )
    session.add_all([user_a, user_b])
    await session.commit()

    async def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    yield session, user_a, user_b
    app.dependency_overrides.clear()
    await session.close()
    await engine.dispose()


@pytest.mark.asyncio
async def test_forum_lifecycle(forum_db):
    session, user_a, user_b = forum_db
    token_a = create_access_token(str(user_a.id))
    token_b = create_access_token(str(user_b.id))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create thread with category
        create_res = await client.post(
            "/api/v1/forum/threads",
            json={
                "title": "How to configure Docker compose?",
                "content": "I am facing connection issues on port 8000.",
                "category": "q-and-a",
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert create_res.status_code == 201, create_res.text
        thread_data = create_res.json()
        thread_id = thread_data["id"]
        assert thread_data["title"] == "How to configure Docker compose?"
        assert thread_data["category"] == "q-and-a"
        assert len(thread_data["replies"]) == 1
        assert thread_data["replies"][0]["is_opening_post"] is True

        # 2. Add reply from user B
        reply_res = await client.post(
            f"/api/v1/forum/threads/{thread_id}/replies",
            json={"content": "Check your .env file and expose the port."},
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert reply_res.status_code == 201, reply_res.text
        reply_data = reply_res.json()
        reply_id = reply_data["id"]
        assert reply_data["is_opening_post"] is False

        # 3. Upvote the reply
        upvote_res = await client.post(
            f"/api/v1/forum/threads/{thread_id}/posts/{reply_id}/upvote",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert upvote_res.status_code == 200
        assert upvote_res.json()["upvotes"] == 1

        # 4. Mark thread as solved
        patch_res = await client.patch(
            f"/api/v1/forum/threads/{thread_id}",
            json={"is_solved": True, "accepted_answer_id": reply_id},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["is_solved"] is True
        assert patch_res.json()["accepted_answer_id"] == reply_id

        # 5. List threads with category filter
        list_res = await client.get("/api/v1/forum/threads?category=q-and-a")
        assert list_res.status_code == 200
        listed = list_res.json()
        assert listed["total"] == 1
        assert listed["threads"][0]["id"] == thread_id
        assert listed["threads"][0]["reply_count"] == 1
        assert listed["threads"][0]["is_solved"] is True

        # 6. Search filter
        search_res = await client.get("/api/v1/forum/threads?search=Docker")
        assert search_res.status_code == 200
        assert search_res.json()["total"] == 1

        search_empty = await client.get("/api/v1/forum/threads?search=NonExistentKeyword")
        assert search_empty.status_code == 200
        assert search_empty.json()["total"] == 0

        # 7. Edit post
        edit_post_res = await client.patch(
            f"/api/v1/forum/threads/{thread_id}/posts/{reply_id}",
            json={"content": "Updated: Make sure ports: - 8000:8000 is mapped."},
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert edit_post_res.status_code == 200
        assert "Updated:" in edit_post_res.json()["content"]

        # 8. Delete reply
        del_reply_res = await client.delete(
            f"/api/v1/forum/threads/{thread_id}/posts/{reply_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert del_reply_res.status_code == 204

        # 9. Verify thread now has 0 replies
        refreshed_thread = await client.get(f"/api/v1/forum/threads/{thread_id}")
        assert refreshed_thread.status_code == 200
        assert refreshed_thread.json()["reply_count"] == 0
        assert len(refreshed_thread.json()["replies"]) == 1

        # 10. Delete thread
        del_thread_res = await client.delete(
            f"/api/v1/forum/threads/{thread_id}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert del_thread_res.status_code == 204

        get_deleted = await client.get(f"/api/v1/forum/threads/{thread_id}")
        assert get_deleted.status_code == 404
