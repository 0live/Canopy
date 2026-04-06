import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useTranslation } from "react-i18next";
import { ExportTarget } from "@/features/data/types";
import type { GeoFileMetadata, GeoFieldImportSettings } from "@/features/data/types";
import { getImportSchema } from "@/features/data/services/forms/importSchema";
import type { ImportFormData } from "@/features/data/services/forms/importSchema";

interface GeoImportPayload {
  layerName: string;
  exportTarget: ExportTarget;
  metadata: GeoFileMetadata;
  fieldSettings: Record<string, GeoFieldImportSettings>;
  file: File;
}

interface UseGeoImportFormParams {
  metadata: GeoFileMetadata;
  file: File;
  fieldSettings: Record<string, GeoFieldImportSettings>;
}

export function useGeoImportForm({ metadata, file, fieldSettings }: UseGeoImportFormParams) {
  const { t } = useTranslation();
  const schema = useMemo(() => getImportSchema(t), [t]);

  const form = useForm<ImportFormData>({
    resolver: yupResolver(schema),
    defaultValues: { layerName: "" },
    mode: "onChange",
  });

  const buildPayload = (values: ImportFormData, exportTarget: ExportTarget): GeoImportPayload => ({
    layerName: values.layerName,
    exportTarget,
    metadata,
    fieldSettings,
    file,
  });

  const onSubmitPostgis = form.handleSubmit((values) => {
    console.log("[GeoImportForm] submit", buildPayload(values, ExportTarget.POSTGIS));
  });

  const onSubmitPmtiles = form.handleSubmit((values) => {
    console.log("[GeoImportForm] submit", buildPayload(values, ExportTarget.PMTILES));
  });

  return { form, onSubmitPostgis, onSubmitPmtiles };
}
