import * as yup from "yup";
import type { TFunction } from "i18next";

export const getProfileSchema = (t: TFunction) =>
  yup.object({
    username: yup
      .string()
      .min(5, t("auth.usernameMinLength", { length: 5 }))
      .matches(/^[a-zA-Z0-9_-]+$/, t("auth.usernameInvalidFormat"))
      .required(t("auth.requiredUsername")),
    email: yup
      .string()
      .email(t("auth.invalidEmail"))
      .required(t("auth.requiredEmail")),
    password: yup
      .string()
      .default("")
      .test(
        "password-min-length",
        t("auth.passwordMinLength", { length: 12 }),
        (v) => !v || v.length >= 12
      ),
    confirmPassword: yup
      .string()
      .default("")
      .when("password", {
        is: (v: string) => !!v,
        then: (s) =>
          s
            .test("confirm-required", t("auth.requiredPassword"), (v) => !!v)
            .test(
              "confirm-match",
              t("auth.passwordMismatch"),
              function (v) {
                return !v || v === this.parent.password;
              }
            ),
      }),
  });

export type ProfileFormData = yup.InferType<ReturnType<typeof getProfileSchema>>;
