import * as yup from "yup";
import type { TFunction } from "i18next";

export const getImportSchema = (t: TFunction) =>
  yup.object({
    layerName: yup
      .string()
      .required(t("data.load.postgis.validation.layerNameRequired"))
      .matches(/^[a-z][a-z0-9_]*$/, t("data.load.postgis.validation.layerNameFormat")),
  });

export type ImportFormData = yup.InferType<ReturnType<typeof getImportSchema>>;
