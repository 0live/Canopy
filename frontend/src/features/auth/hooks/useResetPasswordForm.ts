import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMemo } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { useToast } from "@/shared/hooks/useToast";
import { ToastType } from "@/shared/types/Toast";
import { useResetPassword } from "./useAuth";
import { getResetPasswordSchema } from "../services/form/resetPasswordSchema";
import type { ResetPasswordFormData } from "../services/form/resetPasswordSchema";

export function useResetPasswordForm() {
  const { t } = useTranslation();
  const { mutate: resetPassword, isPending } = useResetPassword();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const schema = useMemo(() => getResetPasswordSchema(t), [t]);

  const form = useForm<ResetPasswordFormData>({
    resolver: yupResolver(schema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  const handleError = (err: unknown) => {
    const isInvalidToken =
      isAxiosError(err) && err.response?.data?.key === "auth.reset_token_invalid";
    const message = isInvalidToken
      ? t("auth.resetTokenInvalid")
      : t("auth.genericError");
    form.setError("root.serverError", { type: "server", message: message as string });
  };

  const onSubmit = form.handleSubmit((values) => {
    resetPassword(
      { token, new_password: values.new_password },
      {
        onSuccess: () => {
          showToast(t("auth.resetPasswordSuccess"), ToastType.Success);
          navigate("/");
        },
        onError: handleError,
      }
    );
  });

  return { form, onSubmit, isPending, t };
}
