import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "../../services/api/adminApi";

const PAGE_SIZE = 25;

export function useAdminUsers() {
  const [page, setPage] = useState(0);
  const skip = page * PAGE_SIZE;

  const query = useQuery({
    queryKey: QUERY_KEYS.ADMIN.USERS(skip, PAGE_SIZE),
    queryFn: () => adminApi.getUsers(skip, PAGE_SIZE),
    placeholderData: (prev) => prev,
  });

  return {
    users: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page,
    pageSize: PAGE_SIZE,
    setPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
  };
}
