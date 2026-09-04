import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_upload_resume_invalid_file(client: AsyncClient, auth_token: str):
    # Test uploading a non-pdf file
    headers = {"Authorization": f"Bearer {auth_token}"}
    files = {"file": ("test.txt", b"dummy content", "text/plain")}
    
    response = await client.post("/api/v1/resumes/upload", files=files, headers=headers)
    assert response.status_code == 400
    assert "Only PDF files are supported" in response.json()["detail"]

@pytest.mark.asyncio
async def test_list_resumes(client: AsyncClient, auth_token: str):
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    response = await client.get("/api/v1/resumes/", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
