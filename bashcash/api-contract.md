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

Errors:
- 400 invalid_zip
- 413 payload_too_large

## POST /v1/sessions
Request:
{
  "session_id": "uuid"
}

Response 200:
{
  "session_id": "uuid",
  "cash_balance": 0,
  "ttl": 1710000000
}

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