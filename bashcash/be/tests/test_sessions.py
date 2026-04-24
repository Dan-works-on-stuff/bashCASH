from __future__ import annotations

from fastapi.testclient import TestClient

import app.main as main_module
import app.sessions as sessions_module
from app.sessions import InMemorySessionStore


client = TestClient(main_module.app)


def test_session_upsert_refreshes_ttl_and_restore_returns_latest_snapshot(monkeypatch):
    store = InMemorySessionStore()
    monkeypatch.setattr(main_module, 'get_session_store', lambda: store)
    monkeypatch.setattr(sessions_module.time, 'time', lambda: 1)

    payload = {
        'vfs': {
            'name': '/',
            'type': 'directory',
            'children': [
                {
                    'name': 'notes.txt',
                    'type': 'file',
                    'content': 'hello',
                },
            ],
        },
        'current_path': '/son1',
        'cash_balance': 30,
        'accuracy_multiplier': 1.3,
    }

    upsert_response = client.post('/v1/sessions/session-123', json=payload)

    assert upsert_response.status_code == 200
    upsert_body = upsert_response.json()
    assert upsert_body['session_id'] == 'session-123'
    assert upsert_body['current_path'] == '/son1'
    assert upsert_body['cash_balance'] == 30
    assert upsert_body['accuracy_multiplier'] == 1.3
    assert upsert_body['ttl'] == 3601
    assert upsert_body['updated_at'] == '1970-01-01T00:00:01Z'

    monkeypatch.setattr(sessions_module.time, 'time', lambda: 100)
    updated_payload = {
        'vfs': {
            'name': '/',
            'type': 'directory',
            'children': [
                {
                    'name': 'notes.txt',
                    'type': 'file',
                    'content': 'updated',
                },
            ],
        },
        'current_path': '/son2',
        'cash_balance': 40,
        'accuracy_multiplier': 1.4,
    }

    second_response = client.put('/v1/sessions/session-123', json=updated_payload)

    assert second_response.status_code == 200
    second_body = second_response.json()
    assert second_body['current_path'] == '/son2'
    assert second_body['cash_balance'] == 40
    assert second_body['accuracy_multiplier'] == 1.4
    assert second_body['ttl'] == 3700

    get_response = client.get('/v1/sessions/session-123')
    assert get_response.status_code == 200
    get_body = get_response.json()
    assert get_body['session_id'] == 'session-123'
    assert get_body['vfs']['children'][0]['content'] == 'updated'
    assert get_body['current_path'] == '/son2'
    assert get_body['cash_balance'] == 40
    assert get_body['accuracy_multiplier'] == 1.4


def test_missing_session_returns_structured_404(monkeypatch):
    store = InMemorySessionStore()
    monkeypatch.setattr(main_module, 'get_session_store', lambda: store)

    response = client.get('/v1/sessions/missing-session')

    assert response.status_code == 404
    body = response.json()
    assert body['error'] == 'session_not_found'
    assert body['message'] == 'Session not found'
    assert isinstance(body['request_id'], str)


def test_delete_session_removes_snapshot(monkeypatch):
    store = InMemorySessionStore()
    monkeypatch.setattr(main_module, 'get_session_store', lambda: store)

    payload = {
        'vfs': {
            'name': '/',
            'type': 'directory',
            'children': [],
        },
        'current_path': '/',
    }

    create_response = client.post('/v1/sessions/session-delete-me', json=payload)
    assert create_response.status_code == 200

    delete_response = client.delete('/v1/sessions/session-delete-me')
    assert delete_response.status_code == 204

    get_response = client.get('/v1/sessions/session-delete-me')
    assert get_response.status_code == 404


