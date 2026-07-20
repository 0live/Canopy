export const QUERY_KEYS = {
  AUTH: {
    AUTO_LOGIN: () => ["auth", "autoLogin"] as const,
    CURRENT_USER: () => ["auth", "currentUser"] as const,
    VERIFY: (token: string) => ["auth", "verify", token] as const,
    CONFIG: () => ["auth", "config"] as const,
  },
  ADMIN: {
    USERS_ALL: () => ["admin", "users"] as const,
    USERS: (skip: number, limit: number) =>
      ["admin", "users", { skip, limit }] as const,
    TEAMS_ALL: () => ["admin", "teams"] as const,
    TEAMS: (skip: number, limit: number) =>
      ["admin", "teams", { skip, limit }] as const,
    ATLASES_ALL: () => ["admin", "atlases"] as const,
    ATLASES: (skip: number, limit: number) =>
      ["admin", "atlases", { skip, limit }] as const,
  },
  DB_ACCESS: {
    STATUS: () => ["dbAccess", "status"] as const,
  },
  NOTIFICATIONS: {
    ALL: () => ["notifications"] as const,
    LIST: (skip: number, limit: number) =>
      ["notifications", "list", { skip, limit }] as const,
    UNREAD: () => ["notifications", "unread"] as const,
  },
};
