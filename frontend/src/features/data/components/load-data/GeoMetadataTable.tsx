import type { GeoFileMetadata, GeoFieldImportSettings, GeoLayerMetadata, GeoMetadataErrors } from "@/features/data/types";
import { GeoMetadataField } from "@/features/data/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/utils";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

interface FileInfoCardsProps {
  metadata: GeoFileMetadata;
  layer: GeoLayerMetadata;
  errors: GeoMetadataErrors;
}

function FileInfoCards({ metadata, layer, errors }: FileInfoCardsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <InfoCard label={t("data.load.postgis.meta.fileName")} value={metadata.fileName} errorKey={errors[GeoMetadataField.FILE_NAME]} />
      <InfoCard label={t("data.load.postgis.meta.fileType")} value={metadata.format.toUpperCase()} errorKey={errors[GeoMetadataField.FILE_TYPE]} />
      <InfoCard label={t("data.load.postgis.meta.fileSize")} value={formatFileSize(metadata.fileSize)} errorKey={errors[GeoMetadataField.FILE_SIZE]} />
      <InfoCard label={t("data.load.postgis.meta.geometryType")} value={layer.geometryType} errorKey={errors[GeoMetadataField.GEOMETRY_TYPE]} />
      <InfoCard label={t("data.load.postgis.meta.epsg")} value={layer.epsg ?? "—"} errorKey={errors[GeoMetadataField.EPSG]} />
    </div>
  );
}

interface FieldRowProps {
  fieldName: string;
  fieldType: string;
  settings: GeoFieldImportSettings;
  onChange: (key: keyof GeoFieldImportSettings, value: boolean) => void;
}

function FieldRow({ fieldName, fieldType, settings, onChange }: FieldRowProps) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{fieldName}</TableCell>
      <TableCell className="text-muted-foreground text-xs">{fieldType}</TableCell>
      <TableCell className="text-center">
        <Checkbox
          checked={settings.include}
          onCheckedChange={(v) => onChange("include", v === true)}
        />
      </TableCell>
      <TableCell className="text-center">
        <Checkbox
          checked={settings.index}
          disabled={!settings.include}
          onCheckedChange={(v) => onChange("index", v === true)}
        />
      </TableCell>
    </TableRow>
  );
}

interface GeoMetadataTableProps {
  metadata: GeoFileMetadata;
  errors: GeoMetadataErrors;
  fieldSettings: Record<string, GeoFieldImportSettings>;
  onFieldSettingChange: (fieldName: string, key: keyof GeoFieldImportSettings, value: boolean) => void;
}

export function GeoMetadataTable({ metadata, errors, fieldSettings, onFieldSettingChange }: GeoMetadataTableProps) {
  const { t } = useTranslation();
  const layer = metadata.layers[0];
  if (!layer) return null;

  const fieldsError = errors[GeoMetadataField.FIELDS];

  return (
    <div className="flex flex-col gap-4">
      <FileInfoCards metadata={metadata} layer={layer} errors={errors} />

      <div className="flex flex-col gap-1">
        <p className={cn(
          "flex items-center gap-1 text-xs font-medium uppercase tracking-wide",
          fieldsError ? "text-destructive" : "text-muted-foreground"
        )}>
          {fieldsError && <AlertCircle className="h-3 w-3 shrink-0" />}
          {t("data.load.postgis.meta.fields")} ({layer.fields.length})
        </p>

        {layer.fields.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("data.load.postgis.meta.fieldName")}</TableHead>
                <TableHead>{t("data.load.postgis.meta.fieldType")}</TableHead>
                <TableHead className="text-center">{t("data.load.postgis.meta.importField")}</TableHead>
                <TableHead className="text-center">{t("data.load.postgis.meta.indexField")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {layer.fields.map((field) => (
                <FieldRow
                  key={field.name}
                  fieldName={field.name}
                  fieldType={field.type}
                  settings={fieldSettings[field.name] ?? { include: true, index: false }}
                  onChange={(key, value) => onFieldSettingChange(field.name, key, value)}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
