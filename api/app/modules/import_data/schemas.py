from pydantic import BaseModel, ConfigDict


class FieldImportSettings(BaseModel):
    model_config = ConfigDict(frozen=True)

    include: bool
    index: bool


class GeofileToDbRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    layer_name: str
    field_settings: dict[str, FieldImportSettings]


class GeofileImportResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    message: str


class FileUploadResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    upload_id: str
    filename: str
    size: int
