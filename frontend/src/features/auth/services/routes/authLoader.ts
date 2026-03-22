import { queryClient } from "@/app/config/queryClient";
import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { STORAGE_KEYS } from "@/shared/constants/storageKeys";
import { useAppStore } from "@/shared/store";
import { authApi } from "../api/authApi";

export const authLoader = async () => {
  const hasAuthSession = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION) === "true";

  if (!hasAuthSession) {
    useAppStore.getState().setLoading(false);
    return null;
  }

  try {
    useAppStore.getState().setLoading(true);
    const tokens = await authApi.refreshToken();
    useAppStore.getState().setAccessToken(tokens.access_token);

    await queryClient.fetchQuery({
      queryKey: QUERY_KEYS.AUTH.CURRENT_USER(),
      queryFn: () => authApi.fetchCurrentUser(),
      staleTime: 1000 * 60 * 5,
    });

    return null;
  } catch {
    useAppStore.getState().clearAuth();
    queryClient.removeQueries({ queryKey: QUERY_KEYS.AUTH.CURRENT_USER() });
    return null;
  } finally {
    useAppStore.getState().setLoading(false);
  }
};
