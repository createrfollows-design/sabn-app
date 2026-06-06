import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    """Small deployment rate limiter; replace with Redis for multi-node scale."""

    def __init__(self, app, limit_per_minute: int) -> None:
        super().__init__(app)
        self.limit_per_minute = limit_per_minute
        self.bucket: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        """Reject excessive requests from the same IP during a rolling minute."""

        client = request.client.host if request.client else "unknown"
        now = time.time()
        window = self.bucket[client]
        while window and now - window[0] > 60:
            window.popleft()
        if len(window) >= self.limit_per_minute:
            return Response("Rate limit exceeded", status_code=429)
        window.append(now)
        return await call_next(request)