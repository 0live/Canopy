from enum import Enum


class NotificationKey(str, Enum):
    ROLES_CHANGED = "ROLES_CHANGED"
    DB_ACCESS_GIVEN = "DB_ACCESS_GIVEN"
