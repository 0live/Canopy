import * as yup from "yup";
import type { TFunction } from "i18next";

export const getResetPasswordSchema = (t: TFunction) =>
  yup.object().shape({
    new_password: yup
      .string()
      .min(12, t("auth.passwordMinLength", { length: 12 }))
      .required(t("auth.requiredPassword")),
    confirm_password: yup
      .string()
      .oneOf([yup.ref("new_password")], t("auth.passwordMismatch"))
      .required(t("auth.requiredPassword")),
  });

export type ResetPasswordFormData = yup.InferType<
  ReturnType<typeof getResetPasswordSchema>
>;
