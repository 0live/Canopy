import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { useAppStore } from "@/shared/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../../services/api/notificationsApi";

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const setUnreadCount = useAppStore((s) => s.setUnreadCount);

  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS.ALL() });
      setUnreadCount(0);
    },
  });
}
