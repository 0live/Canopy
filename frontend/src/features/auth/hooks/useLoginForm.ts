import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMemo } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { useLogin } from "./useAuth";
import { getLoginSchema } from "../services/form/loginSchema";
import type { LoginFormData } from "../services/form/loginSchema";

export function useLoginForm(onSuccess?: () => void) {
  const { t } = useTranslation();
  const { mutate: login, isPending } = useLogin();

  const schema = useMemo(() => getLoginSchema(t), [t]);

  const form = useForm<LoginFormData>({
    resolver: yupResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  const handleError = (err: unknown) => {
    const message = isAxiosError(err) && err.response?.status === 401
      ? t("auth.loginError")
      : t("auth.genericError");
    form.setError("root.serverError", { type: "server", message: message as string });
  };

  const onSubmit = form.handleSubmit((values) => {
    login({ username: values.username, password: values.password }, { onSuccess, onError: handleError });
  });

  return { form, onSubmit, isPending, t };
}
