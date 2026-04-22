from pydantic import BaseModel
from typing import List, Optional, Any
class ParseZipRequest(BaseModel):
    zip_base64: str
# Use a generic dict for children to allow recursive structure easily for now
class VFSNode(BaseModel):
    name: str
    type: str  # "file" or "directory"
    children: Optional[List[Any]] = None
class ParseZipResponse(BaseModel):
    vfs: VFSNode
