from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Protocol

from app.schemas import SessionRecord, SessionSnapshot

SESSION_TTL_SECONDS = 60 * 60
DEFAULT_SESSIONS_TABLE = 'bashcash-sessions'


class SessionNotFoundError(KeyError):
	pass


class SessionStore(Protocol):
	def get(self, session_id: str) -> SessionRecord | None: ...

	def upsert(self, session_id: str, snapshot: SessionSnapshot) -> SessionRecord: ...

	def delete(self, session_id: str) -> None: ...


def _now_epoch() -> int:
	return int(time.time())


def _now_iso(epoch_seconds: int | None = None) -> str:
	return datetime.fromtimestamp(epoch_seconds if epoch_seconds is not None else _now_epoch(), tz=timezone.utc).isoformat().replace('+00:00', 'Z')


def _build_session_record(session_id: str, snapshot: SessionSnapshot) -> SessionRecord:
	now_epoch = _now_epoch()
	return SessionRecord(
		session_id=session_id,
		vfs=snapshot.vfs,
		current_path=snapshot.current_path,
		updated_at=_now_iso(now_epoch),
		ttl=now_epoch + SESSION_TTL_SECONDS,
	)


@dataclass
class InMemorySessionStore:
	sessions: dict[str, SessionRecord] = field(default_factory=dict)

	def get(self, session_id: str) -> SessionRecord | None:
		return self.sessions.get(session_id)

	def upsert(self, session_id: str, snapshot: SessionSnapshot) -> SessionRecord:
		record = _build_session_record(session_id, snapshot)
		self.sessions[session_id] = record
		return record

	def delete(self, session_id: str) -> None:
		self.sessions.pop(session_id, None)


@dataclass
class DynamoDBSessionStore:
	table_name: str = DEFAULT_SESSIONS_TABLE
	_table: Any | None = field(default=None, init=False, repr=False)

	def _get_table(self):
		if self._table is not None:
			return self._table

		try:
			import boto3
		except ImportError as exc:  # pragma: no cover - exercised only in misconfigured runtime
			raise RuntimeError('boto3 is required to use DynamoDBSessionStore') from exc

		self._table = boto3.resource('dynamodb').Table(self.table_name)
		return self._table

	def get(self, session_id: str) -> SessionRecord | None:
		response = self._get_table().get_item(Key={'session_id': session_id})
		item = response.get('Item')
		if not item:
			return None
		return SessionRecord.model_validate(item)

	def upsert(self, session_id: str, snapshot: SessionSnapshot) -> SessionRecord:
		record = _build_session_record(session_id, snapshot)
		self._get_table().put_item(Item=record.model_dump(mode='json'))
		return record

	def delete(self, session_id: str) -> None:
		self._get_table().delete_item(Key={'session_id': session_id})


@lru_cache(maxsize=1)
def get_session_store() -> SessionStore:
	table_name = os.getenv('BASHCASH_SESSIONS_TABLE', '').strip()
	if not table_name:
		return InMemorySessionStore()
	return DynamoDBSessionStore(table_name=table_name)


def load_session(session_id: str, store: SessionStore | None = None) -> SessionRecord | None:
	return (store or get_session_store()).get(session_id)


def save_session(session_id: str, snapshot: SessionSnapshot, store: SessionStore | None = None) -> SessionRecord:
	return (store or get_session_store()).upsert(session_id, snapshot)


def delete_session(session_id: str, store: SessionStore | None = None) -> None:
	(store or get_session_store()).delete(session_id)


