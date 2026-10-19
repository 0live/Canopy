import { useTranslation } from "react-i18next";
import { GeoFileInput } from "@/features/data/components/load-data/GeoFileInput";
import { GeoImportPanel } from "@/features/data/components/load-data/GeoImportPanel";
import { GeoParseProgress } from "@/features/data/components/load-data/GeoParseProgress";
import { useGeoFileMetadata } from "@/features/data/hooks/useGeoFileMetadata";
import { parseErrorMessage } from "@/features/data/services/load-data/geoMessages";
import { MetadataParseStatus } from "@/features/data/types";

export function GeoFilesLoadTab() {
  const { t } = useTranslation();
  const { status, metadata, file, error, progress, parse, reset } = useGeoFileMetadata();

  if (status === MetadataParseStatus.PARSING) return <GeoParseProgress percent={progress} onCancel={reset} />;

  if (status === MetadataParseStatus.ERROR && error) {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-sm text-destructive">
          {t("data.load.postgis.parseError", { error: parseErrorMessage(error, t) })}
        </p>
        <GeoFileInput onChange={parse} />
      </div>
    );
  }

  if (status === MetadataParseStatus.SUCCESS && metadata && file) {
    return <GeoImportPanel metadata={metadata} file={file} onClose={reset} />;
  }

  return <GeoFileInput onChange={parse} />;
}
