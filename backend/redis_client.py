import os
import logging
import redis as redis_lib

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = None
REDIS_AVAILABLE = False

try:
    redis_client = redis_lib.Redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    REDIS_AVAILABLE = True
    logger.info("Connected to Redis successfully via redis_client.py")
except Exception as e:
    redis_client = None
    REDIS_AVAILABLE = False
    logger.warning("Redis unavailable in redis_client.py, continuing without it.")
