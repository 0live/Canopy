export const NotificationType = {
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  ERROR: "ERROR",
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationKey = {
  ROLES_CHANGED: "ROLES_CHANGED",
  DB_ACCESS_GIVEN: "DB_ACCESS_GIVEN",
} as const;

export type NotificationKey = (typeof NotificationKey)[keyof typeof NotificationKey];

export interface Notification {
  id: number;
  type: NotificationType;
  key: NotificationKey | null;
  payload: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationWsMessage {
  type: NotificationType;
  key: NotificationKey | null;
  payload: Record<string, unknown> | null;
  timestamp: string;
}

export interface UserUpdatePayload {
  email?: string;
  username?: string;
  password?: string;
}

export interface NotificationsTableProps {
  notifications: Notification[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: (checked: boolean) => void;
}

export interface DatabaseAccessStatus {
  has_access: boolean;
  is_activated: boolean;
  role_name: string | null;
}

export interface DatabaseActivateResponse {
  role_name: string;
  message: string;
}