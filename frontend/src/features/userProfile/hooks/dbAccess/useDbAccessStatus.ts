import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { useAppStore } from "@/shared/store";
import { useQuery } from "@tanstack/react-query";
import { dbAccessApi } from "../../services/api/dbAccessApi";

export function useDbAccessStatus() {
  const accessToken = useAppStore((s) => s.accessToken);

  return useQuery({
    queryKey: QUERY_KEYS.DB_ACCESS.STATUS(),
    queryFn: () => dbAccessApi.getStatus(),
    enabled: !!accessToken,
  });
}
