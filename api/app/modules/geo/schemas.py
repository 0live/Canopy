from pydantic import BaseModel, ConfigDict


class EpsgDetectRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    wkt: str


class EpsgDetectResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    epsg: str | None
