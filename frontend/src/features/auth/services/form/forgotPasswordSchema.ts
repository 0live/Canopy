import * as yup from "yup";
import type { TFunction } from "i18next";

export const getForgotPasswordSchema = (t: TFunction) =>
  yup.object().shape({
    email: yup
      .string()
      .email(t("auth.invalidEmail"))
      .required(t("auth.requiredEmail")),
  });

export type ForgotPasswordFormData = yup.InferType<
  ReturnType<typeof getForgotPasswordSchema>
>;
