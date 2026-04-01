import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMemo } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { useToast } from "@/shared/hooks/useToast";
import { ToastType } from "@/shared/types/Toast";
import { useRegister } from "./useAuth";
import { getRegisterSchema } from "../services/form/registerSchema";
import type { RegisterFormData } from "../services/form/registerSchema";

export function useRegisterForm(onSuccess?: () => void) {
  const { t } = useTranslation();
  const { mutate: register, isPending, isSuccess } = useRegister();
  const schema = useMemo(() => getRegisterSchema(t), [t]);
  const { showToast } = useToast();

  const form = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: "", username: "", password: "", altcha_payload: "" },
  });

  const handleError = (err: any) => {
    if (isAxiosError(err) && err.response?.data?.key) {
      const { key, params } = err.response.data;
      if (key === "user.email_exists") return form.setError("email", { type: "server", message: t(key, params) as string });
      if (key === "user.username_exists") return form.setError("username", { type: "server", message: t(key, params) as string });
    }
    form.setError("root.serverError", { type: "server", message: t("auth.genericError") as string });
  };

  const onSubmit = form.handleSubmit((v) => register(v, {
    onSuccess: () => {
      showToast(t("auth.validateEmailWarning"), ToastType.Info);
      if (onSuccess) onSuccess();
    },
    onError: handleError
  }));

  return { form, onSubmit, isPending, isSuccess, t };
}
