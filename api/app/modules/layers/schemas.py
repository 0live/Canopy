from pydantic import BaseModel, ConfigDict


class TableColumn(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    # PostgreSQL type name as reported by information_schema (e.g. "character varying")
    data_type: str
