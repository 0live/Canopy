import { queryClient } from "@/app/config/queryClient";
import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { ToastType } from "@/shared/types/Toast";
import { showToast } from "@/shared/utils/toast";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { adminApi } from "../../services/api/adminApi";

export function useUpdateUserRoles(onSuccess?: () => void) {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ userId, roles }: { userId: number; roles: string[] }) =>
      adminApi.updateUserRoles(userId, roles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN.USERS_ALL() });
      showToast(t("admin.users.rolesUpdateSuccess"), ToastType.Success);
      onSuccess?.();
    },
  });
}
