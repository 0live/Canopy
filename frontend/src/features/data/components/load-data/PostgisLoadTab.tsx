import { useGeoFileMetadata } from "@/features/data/hooks/useGeoFileMetadata";
import { Spinner } from "@/shared/components/ui/spinner";
import { useTranslation } from "react-i18next";
import { GeoFileInput } from "./GeoFileInput";
import { GeoMetadataTable } from "./GeoMetadataTable";

export function PostgisLoadTab() {
  const { t } = useTranslation();
  const { status, metadata, error, parse, reset } = useGeoFileMetadata();

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

  if (status === "success" && metadata) {
    return (
      <div className="flex flex-col gap-6">
        <GeoMetadataTable metadata={metadata} />
        <GeoFileInput onChange={(file) => { reset(); parse(file); }} />
      </div>
    );
  }

  return <GeoFileInput onChange={parse} />;
}
