import * as yup from "yup";
import type { TFunction } from "i18next";

export const getLoginSchema = (t: TFunction) => yup.object().shape({
  username: yup.string().required(t("auth.requiredUsername")),
  password: yup.string().required(t("auth.requiredPassword")),
});

export type LoginFormData = yup.InferType<ReturnType<typeof getLoginSchema>>;
