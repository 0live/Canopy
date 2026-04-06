from typing import Annotated

from fastapi import Depends
from pyproj import CRS
from pyproj.exceptions import CRSError

from app.core.exceptions import PermissionDeniedException
from app.core.permissions import has_any_role
from app.modules.geo.schemas import EpsgDetectResponse
from app.modules.users.enums import UserRole
from app.modules.users.schemas import UserDetail


class GeoService:
    """Service for geographic utility operations."""

    def detect_epsg(self, wkt: str, current_user: UserDetail) -> EpsgDetectResponse:
        """Detect EPSG code from a WKT projection string."""
        if not has_any_role(current_user, [UserRole.ADMIN, UserRole.LOAD_DATA]):
            raise PermissionDeniedException()
        try:
            crs = CRS.from_wkt(wkt)
            epsg_code = crs.to_epsg()
            epsg = f"EPSG:{epsg_code}" if epsg_code else None
        except CRSError:
            epsg = None
        return EpsgDetectResponse(epsg=epsg)


def get_geo_service() -> GeoService:
    return GeoService()


GeoServiceDep = Annotated[GeoService, Depends(get_geo_service)]
