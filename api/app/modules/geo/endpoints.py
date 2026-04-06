from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.modules.geo.schemas import EpsgDetectRequest, EpsgDetectResponse
from app.modules.geo.service import GeoServiceDep
from app.modules.users.schemas import UserDetail

geoRouter = APIRouter(prefix="/geo", tags=["Geo"])


@geoRouter.post("/detect-epsg", response_model=EpsgDetectResponse)
async def detect_epsg(
    payload: EpsgDetectRequest,
    service: GeoServiceDep,
    current_user: UserDetail = Depends(get_current_user),
) -> EpsgDetectResponse:
    """Detect EPSG code from a WKT projection string."""
    return service.detect_epsg(payload.wkt, current_user)
