import { queryClient } from "@/app/config/queryClient";
import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { ToastType } from "@/shared/types/Toast";
import { showToast } from "@/shared/utils/toast";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { UserUpdatePayload } from "../../types";
import { userProfileApi } from "../../services/api/userProfileApi";

export function useUpdateProfile() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: UserUpdatePayload }) =>
      userProfileApi.updateProfile(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH.CURRENT_USER() });
      showToast(t("profile.updateSuccess"), ToastType.Success);
    },
  });
}
