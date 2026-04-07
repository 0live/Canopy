from fastapi import APIRouter, Depends, File, UploadFile

from app.core.security import get_current_user
from app.modules.import_data.schemas import FileUploadResponse
from app.modules.import_data.upload_service import UploadServiceDep
from app.modules.users.schemas import UserDetail

importDataRouter = APIRouter(prefix="/import-data", tags=["Import Data"])


@importDataRouter.post("/upload", response_model=FileUploadResponse)
async def upload_geofile(
    service: UploadServiceDep,
    current_user: UserDetail = Depends(get_current_user),
    file: UploadFile = File(...),
) -> FileUploadResponse:
    """Upload a geo file (GeoJSON, Shapefile ZIP) to the server."""
    return await service.upload_geofile(file, current_user)
