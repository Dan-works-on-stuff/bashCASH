from __future__ import annotations

import logging
import time
import uuid
from typing import Any, cast

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum

from app.schemas import ParseZipRequest, ParseZipResponse, SessionRecord, SessionSnapshot, VFSNode
from app.sessions import delete_session, get_session_store, load_session, save_session
from app.vfs import parse_zip_to_vfs

logger = logging.getLogger("bashcash.api")
logger.setLevel(logging.INFO)

app = FastAPI(title="BashCash API")

app.add_middleware(
    cast(Any, CORSMiddleware),
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["x-request-id"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id

    started_at = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - started_at) * 1000
        logger.exception(
            "request_failed method=%s path=%s duration_ms=%.2f request_id=%s",
            request.method,
            request.url.path,
            duration_ms,
            request_id,
        )
        raise

    duration_ms = (time.perf_counter() - started_at) * 1000
    response.headers["x-request-id"] = request_id
    logger.info(
        "request_completed method=%s path=%s status=%s duration_ms=%.2f request_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        request_id,
    )
    return response


def error_payload(code: str, message: str, request_id: str) -> dict[str, str]:
    return {
        "error": code,
        "message": message,
        "request_id": request_id,
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    detail: Any = exc.detail

    if isinstance(detail, dict):
        payload = error_payload(
            str(detail.get("error", "http_error")),
            str(detail.get("message", "Request failed")),
            request_id,
        )
    else:
        payload = error_payload("http_error", str(detail), request_id)

    return JSONResponse(
        status_code=exc.status_code,
        content=payload,
        headers={"x-request-id": request_id},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.exception("unhandled_exception request_id=%s", request_id)
    return JSONResponse(
        status_code=500,
        content=error_payload("internal_error", "Internal server error", request_id),
        headers={"x-request-id": request_id},
    )


@app.get("/v1/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/vfs/parse", response_model=ParseZipResponse)
def parse_vfs(request: ParseZipRequest, raw_request: Request):
    request_id = getattr(raw_request.state, "request_id", "unknown")
    payload_chars = len(request.zip_base64)
    logger.info("vfs_parse_requested payload_chars=%s request_id=%s", payload_chars, request_id)

    try:
        vfs_tree = parse_zip_to_vfs(request.zip_base64)
        root_children = len(vfs_tree.get("children", []))
        logger.info(
            "vfs_parse_succeeded root_children=%s request_id=%s",
            root_children,
            request_id,
        )
        return ParseZipResponse(vfs=VFSNode.model_validate(vfs_tree))
    except Exception as exc:
        logger.exception(
            "vfs_parse_failed payload_chars=%s error_type=%s request_id=%s",
            payload_chars,
            type(exc).__name__,
            request_id,
        )
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_zip",
                "message": "Invalid ZIP payload",
            },
        ) from exc


@app.post('/v1/sessions/{session_id}', response_model=SessionRecord)
def bootstrap_session(session_id: str, request: SessionSnapshot):
    try:
        return save_session(session_id, request, store=get_session_store())
    except Exception as exc:
        logger.exception('session_bootstrap_failed session_id=%s', session_id)
        raise HTTPException(
            status_code=500,
            detail={
                'error': 'session_store_error',
                'message': 'Failed to save session snapshot',
            },
        ) from exc


@app.get('/v1/sessions/{session_id}', response_model=SessionRecord)
def get_session(session_id: str):
    session = load_session(session_id, store=get_session_store())
    if not session:
        raise HTTPException(
            status_code=404,
            detail={
                'error': 'session_not_found',
                'message': 'Session not found',
            },
        )
    return session


@app.put('/v1/sessions/{session_id}', response_model=SessionRecord)
def upsert_session(session_id: str, request: SessionSnapshot):
    try:
        return save_session(session_id, request, store=get_session_store())
    except Exception as exc:
        logger.exception('session_upsert_failed session_id=%s', session_id)
        raise HTTPException(
            status_code=500,
            detail={
                'error': 'session_store_error',
                'message': 'Failed to save session snapshot',
            },
        ) from exc


@app.delete('/v1/sessions/{session_id}', status_code=204)
def remove_session(session_id: str):
    delete_session(session_id, store=get_session_store())
    return Response(status_code=204)


# Mangum wrapper for AWS Lambda
handler = Mangum(app)
