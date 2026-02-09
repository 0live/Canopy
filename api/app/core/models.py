from sqlmodel import SQLModel

# Global metadata configuration
# forcing schema for all models utilizing this metadata
SQLModel.metadata.schema = "app_data"
