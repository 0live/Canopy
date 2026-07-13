import * as yup from "yup";
import type { TFunction } from "i18next";

export const getIdentitySchema = (t: TFunction) =>
  yup.object({
    username: yup
      .string()
      .required(t("auth.requiredUsername"))
      .min(5, t("auth.usernameMinLength", { length: 5 }))
      .matches(/^[a-zA-Z0-9_-]+$/, t("auth.usernameInvalidFormat")),
    email: yup.string().required(t("auth.requiredEmail")).email(t("auth.invalidEmail")),
  });

export type IdentityFormData = yup.InferType<ReturnType<typeof getIdentitySchema>>;
