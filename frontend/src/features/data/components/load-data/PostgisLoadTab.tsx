import { useGeoFileMetadata } from "@/features/data/hooks/useGeoFileMetadata";
import { Spinner } from "@/shared/components/ui/spinner";
import { useTranslation } from "react-i18next";
import { GeoFileInput } from "./GeoFileInput";
import { GeoImportPanel } from "./GeoImportPanel";

export function PostgisLoadTab() {
  const { t } = useTranslation();
  const { status, metadata, file, error, parse, reset } = useGeoFileMetadata();

  if (status === "parsing") {
    return (
      <div className="flex items-center gap-3 py-8 text-muted-foreground">
        <Spinner />
        <span>{t("data.load.postgis.parsing")}</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-destructive">{t("data.load.postgis.parseError", { error })}</p>
        <GeoFileInput onChange={parse} />
      </div>
    );
  }

  if (status === "success" && metadata && file) {
    return <GeoImportPanel metadata={metadata} file={file} onClose={reset} />;
  }

  return <GeoFileInput onChange={parse} />;
}
