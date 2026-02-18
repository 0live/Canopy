from enum import Enum


class PostgreSQLSchemas(str, Enum):
    PUBLIC = "public"
    APP_DATA = "app_data"
    USERS_DATA = "users_data"
