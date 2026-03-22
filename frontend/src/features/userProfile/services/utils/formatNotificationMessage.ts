import type { TFunction } from "i18next";
import { NotificationKey, type Notification } from "../../types";

type FormatterFn = (
  payload: Record<string, unknown> | null,
  t: TFunction
) => string;

const FORMATTERS: Record<NotificationKey, FormatterFn> = {
  [NotificationKey.ROLES_CHANGED]: (payload, t) => {
    const roles = Array.isArray(payload?.new_roles) ? payload.new_roles : [];
    const translatedRoles = roles
      .map((role) => t(`admin.users.roleLabels.${role}`, { defaultValue: role }))
      .join(", ");
    return t("notifications.messages.ROLES_CHANGED", { new_roles: translatedRoles });
  },
  [NotificationKey.DB_ACCESS_GIVEN]: (_payload, t) =>
    t("notifications.messages.DB_ACCESS_GIVEN"),
};

export function formatNotificationMessage(
  notification: Notification,
  t: TFunction
): string {
  if (!notification.key) return t("notifications.newNotification");

  const formatter = FORMATTERS[notification.key];
  return formatter(notification.payload, t);
}
