import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTranslation } from "react-i18next";
import { ExportTarget } from "@/features/data/types";
import type { GeoFileMetadata, GeoFieldImportSettings } from "@/features/data/types";
import { getImportSchema } from "@/features/data/services/forms/importSchema";
import type { ImportFormData } from "@/features/data/services/forms/importSchema";
import { useGeoFileUpload } from "@/features/data/hooks/useGeoFileUpload";

interface UseGeoImportFormParams {
  metadata: GeoFileMetadata;
  file: File;
  fieldSettings: Record<string, GeoFieldImportSettings>;
}

export function useGeoImportForm({ metadata, file, fieldSettings }: UseGeoImportFormParams) {
  const { t } = useTranslation();
  const schema = useMemo(() => getImportSchema(t), [t]);
  const { upload, reset: resetUpload, state: uploadState } = useGeoFileUpload();

  const form = useForm<ImportFormData>({
    resolver: yupResolver(schema),
    defaultValues: { layerName: "" },
    mode: "onChange",
  });

  const buildSubmitHandler = (exportTarget: ExportTarget) =>
    form.handleSubmit((values) => {
      void exportTarget;
      void values;
      void metadata;
      void fieldSettings;
      upload(file);
    });

  const onSubmitPostgis = buildSubmitHandler(ExportTarget.POSTGIS);
  const onSubmitPmtiles = buildSubmitHandler(ExportTarget.PMTILES);

  return { form, onSubmitPostgis, onSubmitPmtiles, uploadState, resetUpload };
}
