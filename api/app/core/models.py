from sqlmodel import SQLModel

from app.core.enums.postgresql_schemas import PostgreSQLSchemas

# Global metadata configuration
# forcing schema for all models utilizing this metadata
SQLModel.metadata.schema = PostgreSQLSchemas.APP_DATA
