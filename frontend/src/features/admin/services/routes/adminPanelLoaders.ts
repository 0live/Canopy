import { queryClient } from "@/app/config/queryClient";
import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { adminApi } from "../api/adminApi";

const PAGE_SIZE = 25;

export async function usersLoader() {
  await queryClient.prefetchQuery({
    queryKey: QUERY_KEYS.ADMIN.USERS(0, PAGE_SIZE),
    queryFn: () => adminApi.getUsers(0, PAGE_SIZE),
  });
  return null;
}

export async function teamsLoader() {
  await queryClient.prefetchQuery({
    queryKey: QUERY_KEYS.ADMIN.TEAMS(0, PAGE_SIZE),
    queryFn: () => adminApi.getTeams(0, PAGE_SIZE),
  });
  return null;
}

export async function atlasesLoader() {
  await queryClient.prefetchQuery({
    queryKey: QUERY_KEYS.ADMIN.ATLASES(0, PAGE_SIZE),
    queryFn: () => adminApi.getAtlases(0, PAGE_SIZE),
  });
  return null;
}
