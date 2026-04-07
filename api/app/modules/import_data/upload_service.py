from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, UploadFile

from app.core.config import get_settings
from app.core.exceptions import FileUploadException, PermissionDeniedException
from app.core.permissions import has_any_role
from app.modules.import_data.enums import AllowedGeoExtension
from app.modules.import_data.schemas import FileUploadResponse
from app.modules.users.enums import UserRole
from app.modules.users.schemas import UserDetail


def _validate_extension(filename: str | None) -> None:
    if not filename:
        raise FileUploadException(key="import_data.upload_missing_filename")
    suffix = Path(filename).suffix.lower()
    allowed = {e.value for e in AllowedGeoExtension}
    if suffix not in allowed:
        raise FileUploadException(
            key="import_data.upload_invalid_format",
            params={"allowed": ", ".join(allowed)},
        )


class UploadService:
    def __init__(self, uploads_dir: Path):
        self._uploads_dir = uploads_dir

    async def upload_geofile(
        self, file: UploadFile, current_user: UserDetail
    ) -> FileUploadResponse:
        if not has_any_role(current_user, [UserRole.ADMIN, UserRole.LOAD_DATA]):
            raise PermissionDeniedException()
        _validate_extension(file.filename)
        return await self._persist(file)

    async def _persist(self, file: UploadFile) -> FileUploadResponse:
        upload_id = str(uuid4())
        dest_dir = self._uploads_dir / upload_id
        dest_dir.mkdir(parents=True, exist_ok=True)
        content = await file.read()
        (dest_dir / file.filename).write_bytes(content)
        return FileUploadResponse(
            upload_id=upload_id,
            filename=file.filename,
            size=len(content),
        )


def get_upload_service() -> UploadService:
    uploads_dir = Path(get_settings().uploads_dir)
    return UploadService(uploads_dir)


UploadServiceDep = Annotated[UploadService, Depends(get_upload_service)]
