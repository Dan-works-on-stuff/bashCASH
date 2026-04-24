from pydantic import BaseModel
from typing import List, Optional, Any


class ParseZipRequest(BaseModel):
    zip_base64: str


# Use a generic dict for children to allow recursive structure easily for now
class VFSNode(BaseModel):
    name: str
    type: str  # "file" or "directory"
    size: Optional[int] = None
    modified: Optional[str] = None
    url: Optional[str] = None
    content: Optional[str] = None
    children: Optional[List[Any]] = None


class ParseZipResponse(BaseModel):
    vfs: VFSNode


class SessionSnapshot(BaseModel):
    vfs: VFSNode
    current_path: str = "/"


class SessionRecord(SessionSnapshot):
    session_id: str
    updated_at: str
    ttl: int

