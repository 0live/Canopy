import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { notificationsApi } from "../../services/api/notificationsApi";

const PAGE_SIZE = 25;

export function useNotifications() {
  const [page, setPage] = useState(0);
  const skip = page * PAGE_SIZE;

  const query = useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS.LIST(skip, PAGE_SIZE),
    queryFn: () => notificationsApi.getNotifications(skip, PAGE_SIZE),
    placeholderData: (prev) => prev,
  });

  return {
    notifications: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page,
    pageSize: PAGE_SIZE,
    setPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
  };
}
