import { yupResolver } from "@hookform/resolvers/yup";
import { ToastType } from "@/shared/types/Toast";
import { showToast } from "@/shared/utils/toast";
import { isAxiosError } from "axios";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { dbAccessApi } from "../../services/api/dbAccessApi";
import { getDbPasswordSchema, type DbPasswordFormData } from "../../services/forms/dbAccessSchema";

export function useUpdatePasswordForm() {
  const { t } = useTranslation();
  const schema = useMemo(() => getDbPasswordSchema(t), [t]);

  const { mutate: updatePassword, isPending } = useMutation({
    mutationFn: (password: string) => dbAccessApi.updatePassword(password),
    onSuccess: () => {
      showToast(t("dbAccess.updatePasswordSuccess"), ToastType.Success);
    },
  });

  const form = useForm<DbPasswordFormData>({
    resolver: yupResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    updatePassword(values.password, {
      onSuccess: () => {
        form.reset();
      },
      onError: (err) => {
        if (isAxiosError(err) && err.response?.data?.key) {
          const key: string = err.response.data.key;
          const msg = t(`dbAccess.errors.${key.replace("db_access.", "")}`, {
            defaultValue: t("auth.genericError"),
          });
          form.setError("root.serverError", { type: "server", message: msg });
        } else {
          form.setError("root.serverError", { type: "server", message: t("auth.genericError") });
        }
      },
    });
  });

  return { form, onSubmit, isPending, t };
}
