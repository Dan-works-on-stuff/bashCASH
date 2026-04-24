# BashCash API Contract (v1)

## POST /v1/vfs/parse
Request:
{
  "zip_base64": "string"
}

Response 200:
{
  "vfs": {
    "name": "/",
    "type": "directory",
    "children": []
  }
}

`vfs` file nodes may include optional metadata fields:
- `size` (number)
- `modified` (ISO datetime string)
- `url` (string, for assets like images)
- `content` (string, included for UTF-8 `.txt` and `.sh` files)

Error response format:
{
  "error": "string",
  "message": "string",
  "request_id": "string"
}

Errors:
- 400 invalid_zip
- 413 payload_too_large

## POST /v1/sessions/{session_id}
Request:
{
  "vfs": { "name": "/", "type": "directory", "children": [] },
  "current_path": "/"
}

Response 200:
{
  "session_id": "uuid",
  "vfs": { "name": "/", "type": "directory", "children": [] },
  "current_path": "/",
  "updated_at": "2026-04-24T12:00:00Z",
  "ttl": 1710000000
}

## GET /v1/sessions/{session_id}
Response 200:
{
  "session_id": "uuid",
  "vfs": { "name": "/", "type": "directory", "children": [] },
  "current_path": "/",
  "updated_at": "2026-04-24T12:00:00Z",
  "ttl": 1710000000
}

Errors:
- 404 session_not_found

## PUT /v1/sessions/{session_id}
Request:
{
  "vfs": { "name": "/", "type": "directory", "children": [] },
  "current_path": "/son1"
}

Response 200:
{
  "session_id": "uuid",
  "vfs": { "name": "/", "type": "directory", "children": [] },
  "current_path": "/son1",
  "updated_at": "2026-04-24T12:00:00Z",
  "ttl": 1710000000
}

Behavior:
- Session snapshots are stored per `session_id` only; there are no user accounts.
- Every save refreshes `ttl` to 1 hour from the save time.
- The frontend is responsible for generating and reusing the `session_id` (for example via `localStorage`).

## DELETE /v1/sessions/{session_id}
Response:
- `204 No Content` (idempotent)

Behavior:
- Removes the session snapshot for the given `session_id`.
- Used by the frontend `New session` reset action before rotating to a new session id.

## POST /v1/sessions/{session_id}/cash/increment
Request:
{
  "amount": 10,
  "reason": "challenge:ls-basics",
  "idempotency_key": "uuid"
}

Response 200:
{
  "session_id": "uuid",
  "cash_balance": 40
}

Errors:
- 400 invalid_amount
- 404 session_not_found
- 409 duplicate_idempotency_key

## POST /v1/ai/explain
Request:
{
  "session_id": "uuid",
  "command": "grep",
  "context": "optional string"
}

Response 200:
{
  "explanation": "string",
  "model": "claude-3-haiku",
  "tokens_used": 123
}