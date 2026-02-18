from typing import List

from pydantic import BaseModel, ConfigDict, EmailStr


class UserInTeam(BaseModel):
    id: int
    username: str
    email: EmailStr
    model_config = ConfigDict(from_attributes=True, frozen=True)


class TeamBase(BaseModel):
    name: str
    model_config = ConfigDict(from_attributes=True, frozen=True)


class TeamSummary(TeamBase):
    id: int


class TeamDetail(TeamSummary):
    users: List[UserInTeam] = []


class TeamMemberCreate(BaseModel):
    model_config = ConfigDict(frozen=True)
    user_id: int


class TeamUpdate(BaseModel):
    name: str | None = None
    model_config = ConfigDict(from_attributes=True, frozen=True)
