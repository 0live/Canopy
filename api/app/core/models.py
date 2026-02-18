from sqlmodel import SQLModel

from app.core.enums.postgresql_schema import PostgreSQLSchema

# Global metadata configuration
# forcing schema for all models utilizing this metadata
SQLModel.metadata.schema = PostgreSQLSchema.APP_DATA
