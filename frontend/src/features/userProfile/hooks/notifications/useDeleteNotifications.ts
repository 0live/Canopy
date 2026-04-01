import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { ToastType } from "@/shared/types/Toast";
import { showToast } from "@/shared/utils/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { notificationsApi } from "../../services/api/notificationsApi";

export function useDeleteNotifications(onSuccess?: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => notificationsApi.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS.ALL() });
      showToast(t("notifications.deleteSuccess"), ToastType.Success);
      onSuccess?.();
    },
  });
}
