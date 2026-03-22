import * as yup from "yup";
import type { TFunction } from "i18next";

const MIN_PASSWORD_LENGTH = 12;

export const getDbPasswordSchema = (t: TFunction) =>
  yup.object({
    password: yup
      .string()
      .required(t("auth.requiredPassword"))
      .min(MIN_PASSWORD_LENGTH, t("auth.passwordMinLength", { length: MIN_PASSWORD_LENGTH })),
    confirmPassword: yup
      .string()
      .required(t("auth.requiredPassword"))
      .oneOf([yup.ref("password")], t("auth.passwordMismatch")),
  });

export type DbPasswordFormData = yup.InferType<ReturnType<typeof getDbPasswordSchema>>;
