import os
import logging
import redis as redis_lib
from redis import ConnectionPool

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = None
REDIS_AVAILABLE = False

try:
    # Use a connection pool for lower latency — avoids per-request TCP handshakes
    pool = ConnectionPool.from_url(
        REDIS_URL,
        decode_responses=True,
        max_connections=20,          # up to 20 simultaneous connections
        socket_connect_timeout=2,    # give up connecting after 2 s
        socket_timeout=2,            # abort blocked commands after 2 s
        retry_on_timeout=True,       # transparently retry once on timeout
        health_check_interval=30,    # auto-ping idle connections every 30 s
    )
    redis_client = redis_lib.Redis(connection_pool=pool)
    redis_client.ping()
    REDIS_AVAILABLE = True
    logger.info("Connected to Redis successfully (connection pool, max_connections=20).")
except Exception as e:
    redis_client = None
    REDIS_AVAILABLE = False
    logger.warning("Redis unavailable (%s) — continuing without it.", e)
