import hashlib
from typing import Annotated

from fastapi import Depends

from app.modules.layers.constants import PostgresLimit


class LayerNamingService:
    """Service for naming the database objects of a layer table."""

    # Length of the digest suffix appended to shortened names
    DIGEST_LENGTH = 8

    def index_name(self, table_name: str, column_name: str) -> str:
        """Index name for a column, shortened with a digest so long names stay unique."""
        name = f"idx_{table_name}_{column_name}"
        if len(name) <= PostgresLimit.IDENTIFIER_MAX_LENGTH:
            return name
        digest = hashlib.sha1(name.encode()).hexdigest()[: self.DIGEST_LENGTH]
        prefix_length = PostgresLimit.IDENTIFIER_MAX_LENGTH - self.DIGEST_LENGTH - 1
        return f"{name[:prefix_length]}_{digest}"


def get_layer_naming_service() -> LayerNamingService:
    return LayerNamingService()


LayerNamingServiceDep = Annotated[LayerNamingService, Depends(get_layer_naming_service)]
