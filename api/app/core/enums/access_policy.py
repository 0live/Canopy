from enum import Enum


class AccessPolicy(str, Enum):
    STANDARD = "standard"  # Private but shareable to teams
    INTERNAL = "internal"  # Visible to all registered users
    PUBLIC = "public"  # Visible to all users
