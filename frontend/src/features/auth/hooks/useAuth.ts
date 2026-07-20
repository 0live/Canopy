import { queryClient } from "@/app/config/queryClient";
import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { useAppStore } from "@/shared/store";
import { UserRole } from "@/shared/types/UserRole";
import { useMutation, useQuery } from "@tanstack/react-query";
import { authApi } from "../services/api/authApi";
import type { ForgotPasswordCredentials, ResetPasswordCredentials, User } from "../types";

export const canLoadData = (user: User | undefined): boolean =>
  !!(user?.roles.includes(UserRole.ADMIN) || user?.roles.includes(UserRole.LOAD_DATA));

export const useCanLoadData = (): boolean => {
  const { data: user } = useCurrentUser();
  return canLoadData(user);
};

export const canWithDbAccess = (user: User | undefined): boolean =>
  !!user?.roles.includes(UserRole.WITHDBACCESS);

export const useCanWithDbAccess = (): boolean => {
  const { data: user } = useCurrentUser();
  return canWithDbAccess(user);
};

export const useAuthConfig = () => {
  return useQuery({
    queryKey: QUERY_KEYS.AUTH.CONFIG(),
    queryFn: () => authApi.fetchConfig(),
    staleTime: Infinity,
  });
};

export const useCurrentUser = () => {
  const accessToken = useAppStore((s) => s.accessToken);

  return useQuery({
    queryKey: QUERY_KEYS.AUTH.CURRENT_USER(),
    queryFn: () => authApi.fetchCurrentUser(),
    enabled: !!accessToken,
    retry: false,
  });
};

export const useLogin = () => {
  const setAccessToken = useAppStore((s) => s.setAccessToken);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      setAccessToken(data.access_token);
      const user = await authApi.fetchCurrentUser();
      queryClient.setQueryData(QUERY_KEYS.AUTH.CURRENT_USER(), user);
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: authApi.register,
  });
};

export const useLogout = () => {
  const clearAuth = useAppStore((s) => s.clearAuth);

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearAuth();
      queryClient.removeQueries({ queryKey: QUERY_KEYS.AUTH.CURRENT_USER() });
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (credentials: ForgotPasswordCredentials) =>
      authApi.forgotPassword(credentials),
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: (credentials: ResetPasswordCredentials) =>
      authApi.resetPassword(credentials),
  });
};
