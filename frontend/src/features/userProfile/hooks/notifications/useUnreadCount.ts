import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { useAppStore } from "@/shared/store";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { notificationsApi } from "../../services/api/notificationsApi";

export function useUnreadCount() {
  const accessToken = useAppStore((s) => s.accessToken);
  const setUnreadCount = useAppStore((s) => s.setUnreadCount);

  const query = useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS.UNREAD(),
    queryFn: notificationsApi.getUnread,
    enabled: !!accessToken,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setUnreadCount(query.data.length);
    }
  }, [query.data, setUnreadCount]);
}
