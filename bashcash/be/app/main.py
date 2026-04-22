from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from app.schemas import ParseZipRequest, ParseZipResponse
from app.vfs import parse_zip_to_vfs
app = FastAPI(title="BashCash API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.post("/v1/vfs/parse", response_model=ParseZipResponse)
def parse_vfs(request: ParseZipRequest):
    try:
        vfs_tree = parse_zip_to_vfs(request.zip_base64)
        return ParseZipResponse(vfs=vfs_tree)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid ZIP payload: {str(e)}")
# Mangum wrapper for AWS Lambda
handler = Mangum(app)
