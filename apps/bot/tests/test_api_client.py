# Tests for the API client HTTP calls
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_open_session_success():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "success": True,
        "data": {"id": "session-abc", "topic": "Test"},
    }
    mock_response.status_code = 201

    with patch("httpx.AsyncClient") as MockClient:
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(return_value=mock_response)
        MockClient.return_value = mock_client

        from src.services.api_client import open_session
        result = await open_session("-100123", "Tema teste", "user1")
        assert result["id"] == "session-abc"


@pytest.mark.asyncio
async def test_open_session_api_error():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "success": False,
        "error": "Já existe uma sessão aberta",
    }
    mock_response.status_code = 409

    with patch("httpx.AsyncClient") as MockClient:
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(return_value=mock_response)
        MockClient.return_value = mock_client

        from src.services.api_client import open_session, APIError
        with pytest.raises(APIError) as exc_info:
            await open_session("-100123", "Tema", "user1")
        assert exc_info.value.status_code == 409
