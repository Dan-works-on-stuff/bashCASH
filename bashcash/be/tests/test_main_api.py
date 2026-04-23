from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_returns_ok_and_request_id_header():
    response = client.get("/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers.get("x-request-id")


def test_parse_vfs_success(make_zip_base64):
    payload = make_zip_base64({"folder/file.txt": "abc"})

    response = client.post("/v1/vfs/parse", json={"zip_base64": payload})

    assert response.status_code == 200
    assert response.headers.get("x-request-id")

    body = response.json()
    assert body["vfs"]["name"] == "/"
    assert body["vfs"]["type"] == "directory"


def test_parse_vfs_invalid_zip_returns_error_contract():
    response = client.post("/v1/vfs/parse", json={"zip_base64": "invalid"})

    assert response.status_code == 400
    assert response.headers.get("x-request-id")

    body = response.json()
    assert body["error"] == "invalid_zip"
    assert body["message"] == "Invalid ZIP payload"
    assert isinstance(body["request_id"], str)
    assert body["request_id"] == response.headers["x-request-id"]

