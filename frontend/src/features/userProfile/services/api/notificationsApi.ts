import { apiClient } from "@/app/config/apiClient";
import type { Notification } from "@/features/userProfile/types";
import type { PaginatedResponse } from "@/shared/types/Pagination";

export const notificationsApi = {
  getNotifications: async (
    skip: number,
    limit: number
  ): Promise<PaginatedResponse<Notification>> => {
    const { data } = await apiClient.get<PaginatedResponse<Notification>>(
      "/notifications",
      { params: { skip, limit } }
    );
    return data;
  },

  getUnread: async (): Promise<Notification[]> => {
    const { data } = await apiClient.get<PaginatedResponse<Notification>>(
      "/notifications",
      { params: { unread_only: true, limit: 100 } }
    );
    return data.items;
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.patch("/notifications/read-all");
  },

  bulkDelete: async (ids: number[]): Promise<{ deleted: number }> => {
    const { data } = await apiClient.post<{ deleted: number }>(
      "/notifications/bulk-delete",
      { notification_ids: ids }
    );
    return data;
  },
};
