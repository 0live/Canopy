import { queryClient } from "@/app/config/queryClient";
import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { ToastType } from "@/shared/types/Toast";
import { showToast } from "@/shared/utils/toast";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { adminApi } from "../../services/api/adminApi";

export function useDeleteUser(onSuccess?: () => void) {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (userId: number) => adminApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.USERS_ALL() });
      showToast(t("admin.users.deleteSuccess"), ToastType.Success);
      onSuccess?.();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.USERS_ALL() });
        showToast(t("admin.users.deleteNotFound"), ToastType.Critical);
        onSuccess?.();
      }
    },
  });
}
