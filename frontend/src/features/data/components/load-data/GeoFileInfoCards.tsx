import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { EpsgSource } from "@/features/data/services/geo-parsing/core/enums";
import type { GeoFileMetadata, GeoLayerMetadata, GeoMetadataErrors } from "@/features/data/types";
import { GeoMetadataField } from "@/features/data/types";
import { cn } from "@/shared/lib/utils";

const KIB = 1024;
const MIB = KIB * KIB;
const MISSING_VALUE = "—";

function formatFileSize(bytes: number): string {
  if (bytes < KIB) return `${bytes} B`;
  if (bytes < MIB) return `${(bytes / KIB).toFixed(1)} KB`;
  return `${(bytes / MIB).toFixed(1)} MB`;
}

function formatEpsg(layer: GeoLayerMetadata, t: TFunction): string {
  if (!layer.epsg) return MISSING_VALUE;
  if (layer.epsgSource === EpsgSource.DETECTED) return t("data.load.postgis.meta.epsgDetected", { epsg: layer.epsg });
  return layer.epsg;
}

interface InfoCardProps {
  label: string;
  value: string;
  errorKey?: string;
}

function InfoCard({ label, value, errorKey }: InfoCardProps) {
  const { t } = useTranslation();
  const hasError = Boolean(errorKey);
  return (
    <div className={cn(
      "flex flex-col gap-0.5 rounded-md border px-3 py-2 min-w-0",
      hasError ? "border-destructive bg-destructive/5" : "bg-muted/40"
    )}>
      <div className="flex items-center gap-1">
        {hasError && <AlertCircle className="h-3 w-3 text-destructive shrink-0" />}
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <span className={cn("text-sm font-medium truncate", hasError && "text-destructive")}>
        {hasError ? t(errorKey!) : value}
      </span>
    </div>
  );
}

interface GeoFileInfoCardsProps {
  metadata: GeoFileMetadata;
  layer: GeoLayerMetadata;
  errors: GeoMetadataErrors;
}

export function GeoFileInfoCards({ metadata, layer, errors }: GeoFileInfoCardsProps) {
  const { t, i18n } = useTranslation();
  const featureCount = layer.featureCount === null
    ? MISSING_VALUE
    : new Intl.NumberFormat(i18n.language).format(layer.featureCount);
  const cards: [GeoMetadataField, string][] = [
    [GeoMetadataField.FILE_NAME, metadata.fileName],
    [GeoMetadataField.FILE_TYPE, metadata.format.toUpperCase()],
    [GeoMetadataField.FILE_SIZE, formatFileSize(metadata.fileSize)],
    [GeoMetadataField.GEOMETRY_TYPE, layer.geometryType],
    [GeoMetadataField.EPSG, formatEpsg(layer, t)],
    [GeoMetadataField.FEATURE_COUNT, featureCount],
    [GeoMetadataField.ENCODING, layer.encoding ?? MISSING_VALUE],
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map(([field, value]) => (
        <InfoCard key={field} label={t(`data.load.postgis.meta.${field}`)} value={value} errorKey={errors[field]} />
      ))}
    </div>
  );
}
