import * as yup from "yup";
import type { TFunction } from "i18next";

export const getPasswordSchema = (t: TFunction) =>
  yup.object({
    currentPassword: yup.string().required(t("auth.requiredPassword")),
    password: yup
      .string()
      .required(t("auth.requiredPassword"))
      .min(12, t("auth.passwordMinLength", { length: 12 })),
    confirmPassword: yup
      .string()
      .required(t("auth.requiredPassword"))
      .oneOf([yup.ref("password")], t("auth.passwordMismatch")),
  });

export type PasswordFormData = yup.InferType<ReturnType<typeof getPasswordSchema>>;
