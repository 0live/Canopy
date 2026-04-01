import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForgotPassword } from "./useAuth";
import { getForgotPasswordSchema } from "../services/form/forgotPasswordSchema";
import type { ForgotPasswordFormData } from "../services/form/forgotPasswordSchema";

export function useForgotPasswordForm() {
  const { t } = useTranslation();
  const { mutate: forgotPassword, isPending, isSuccess } = useForgotPassword();
  const schema = useMemo(() => getForgotPasswordSchema(t), [t]);

  const form = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    forgotPassword({ email: values.email });
  });

  return { form, onSubmit, isPending, isSuccess, t };
}
