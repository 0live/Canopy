import { GeoFileInfoCards } from "@/features/data/components/load-data/GeoFileInfoCards";
import { GeoWarningList } from "@/features/data/components/load-data/GeoWarningList";
import type { GeoFileMetadata, GeoFieldImportSettings, GeoMetadataErrors } from "@/features/data/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeadCheckbox,
  TableRow,
} from "@/shared/components/ui/table";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useTranslation } from "react-i18next";

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
      <TableCell>
        <Checkbox
          checked={settings.include}
          onCheckedChange={(v) => onChange("include", v === true)}
        />
      </TableCell>
      <TableCell>
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
  onToggleAllInclude: (include: boolean) => void;
}

export function GeoMetadataTable({ metadata, errors, fieldSettings, onFieldSettingChange, onToggleAllInclude }: GeoMetadataTableProps) {
  const { t } = useTranslation();
  const layer = metadata.layers[0];
  if (!layer) return null;

  const allIncluded = layer.fields.every((f) => fieldSettings[f.name]?.include ?? true);
  const someIncluded = layer.fields.some((f) => fieldSettings[f.name]?.include ?? true);

  return (
    <div className="flex flex-col gap-4">
      <GeoFileInfoCards metadata={metadata} layer={layer} errors={errors} />
      <GeoWarningList warnings={layer.warnings} />

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("data.load.postgis.meta.fields")} ({layer.fields.length})
        </p>

        {layer.fields.length > 0 && (
          <div className="[&_[data-slot=table-container]]:max-h-[40vh] [&_[data-slot=table-container]]:overflow-y-auto [&_[data-slot=table-container]]:rounded-md [&_[data-slot=table-container]]:border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("data.load.postgis.meta.fieldName")}</TableHead>
                <TableHead>{t("data.load.postgis.meta.fieldType")}</TableHead>
                <TableHeadCheckbox
                  checked={allIncluded ? true : someIncluded ? "indeterminate" : false}
                  onCheckedChange={onToggleAllInclude}
                  label={t("data.load.postgis.meta.importField")}
                />
                <TableHead>{t("data.load.postgis.meta.indexField")}</TableHead>
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
          </div>

        )}
      </div>
    </div>
  );
}
