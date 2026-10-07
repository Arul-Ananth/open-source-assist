"""Redis client connection manager and cache utilities.

Provides an async Redis client with automatic fallback resilience:
if Redis is unreachable, the system gracefully falls back to direct database
operations without throwing fatal application errors.
"""

import json
import logging
from typing import Any

import redis.asyncio as aioredis
from redis.exceptions import RedisError

from backend.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: aioredis.Redis | None = None


def get_redis_client() -> aioredis.Redis:
    """Obtain or initialize the singleton Async Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=2.0,
            socket_connect_timeout=2.0,
        )
    return _redis_client


class RedisCacheService:
    """High-level caching service for API entities with error resilience."""

    @staticmethod
    async def get(key: str) -> Any | None:
        """Fetch and deserialize a JSON cached value."""
        try:
            client = get_redis_client()
            val = await client.get(key)
            if val is not None:
                return json.loads(val)
        except (RedisError, json.JSONDecodeError, OSError) as exc:
            logger.debug("Redis cache get error for key %s: %s", key, exc)
        return None

    @staticmethod
    async def set(key: str, value: Any, ttl_seconds: int = 300) -> bool:
        """Serialize and set a cached value with TTL."""
        try:
            client = get_redis_client()
            payload = json.dumps(value, default=str)
            await client.set(key, payload, ex=ttl_seconds)
            return True
        except (RedisError, TypeError, OSError) as exc:
            logger.debug("Redis cache set error for key %s: %s", key, exc)
            return False

    @staticmethod
    async def delete(key: str) -> bool:
        """Delete a key from Redis."""
        try:
            client = get_redis_client()
            await client.delete(key)
            return True
        except (RedisError, OSError) as exc:
            logger.debug("Redis cache delete error for key %s: %s", key, exc)
            return False

    @staticmethod
    async def delete_prefix(prefix: str) -> int:
        """Delete all keys matching a prefix wildcard."""
        try:
            client = get_redis_client()
            count = 0
            async for key in client.scan_iter(match=f"{prefix}*"):
                await client.delete(key)
                count += 1
            return count
        except (RedisError, OSError) as exc:
            logger.debug("Redis cache delete_prefix error for %s: %s", prefix, exc)
            return 0

    @staticmethod
    async def ping() -> bool:
        """Check if Redis connection is active and responsive."""
        try:
            client = get_redis_client()
            return await client.ping()
        except Exception:
            return False
