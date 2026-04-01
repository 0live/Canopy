export interface AdminUserSummary {
  id: number;
  username: string;
  email: string;
  roles: string[];
  is_verified: boolean;
}

export interface TeamSummary {
  id: number;
  name: string;
}

export interface AtlasSummary {
  id: number;
  name: string;
  description: string;
}

export const AdminPanel = {
  USERS: "users",
  TEAMS: "teams",
  ATLASES: "atlases",
  TILE_FLUX: "tile-flux",
  DATA: "data",
} as const;

export const ADMIN_PANELS = Object.values(AdminPanel) as AdminPanel[];

export type AdminPanel = (typeof AdminPanel)[keyof typeof AdminPanel];

