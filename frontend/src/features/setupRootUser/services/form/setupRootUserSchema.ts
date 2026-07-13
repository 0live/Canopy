import * as yup from "yup";
import type { TFunction } from "i18next";

export const getSetupRootUserSchema = (t: TFunction) =>
  yup.object().shape({
    email: yup.string().email(t("auth.invalidEmail")).required(t("auth.requiredEmail")),
    username: yup
      .string()
      .min(5, t("auth.usernameMinLength", { length: 5 }))
      .matches(/^[a-zA-Z0-9_-]+$/, t("auth.usernameInvalidFormat"))
      .required(t("auth.requiredUsername")),
    password: yup
      .string()
      .min(12, t("auth.passwordMinLength", { length: 12 }))
      .required(t("auth.requiredPassword")),
  });

export type SetupRootUserFormData = yup.InferType<
  ReturnType<typeof getSetupRootUserSchema>
>;
