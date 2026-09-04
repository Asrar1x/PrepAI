import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

BASE_URL = "http://127.0.0.1:7857"


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session")
def base_url() -> str:
    """URL of the live uvicorn server (started separately by the test runner)."""
    return BASE_URL


@pytest.fixture(scope="session")
async def client():
    """In-process ASGI client for unit-style tests."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
