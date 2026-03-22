import * as yup from "yup";
import type { TFunction } from "i18next";

export const getProfileSchema = (t: TFunction) =>
  yup.object({
    username: yup
      .string()
      .min(5, t("auth.usernameMinLength", { length: 5 }))
      .matches(/^[a-zA-Z0-9_-]+$/, t("auth.usernameInvalidFormat")),
    email: yup.string().email(t("auth.invalidEmail")),
    password: yup
      .string()
      .transform((v) => (v === "" ? undefined : v))
      .optional()
      .min(12, t("auth.passwordMinLength", { length: 12 })),
    confirmPassword: yup
      .string()
      .transform((v) => (v === "" ? undefined : v))
      .when("password", {
        is: (v: string | undefined) => !!v,
        then: (s) =>
          s
            .required(t("auth.requiredPassword"))
            .oneOf([yup.ref("password")], t("auth.passwordMismatch")),
      }),
  });

export type ProfileFormData = yup.InferType<ReturnType<typeof getProfileSchema>>;
