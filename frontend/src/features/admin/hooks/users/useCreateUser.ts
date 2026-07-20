import { queryClient } from "@/app/config/queryClient";
import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { ToastType } from "@/shared/types/Toast";
import { showToast } from "@/shared/utils/toast";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { adminApi } from "../../services/api/adminApi";
import type { CreateUserPayload } from "../../types";

export function useCreateUser(onSuccess?: () => void) {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => adminApi.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.USERS_ALL() });
      showToast(t("admin.users.createSuccess"), ToastType.Success);
      onSuccess?.();
    },
  });
}
