import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { GeoFileMetadata, GeoFieldImportSettings } from "@/features/data/types";
import { validateLayerMetadata } from "@/features/data/services/load-data/medataUtils";
import { useGeoImportForm } from "@/features/data/hooks/useGeoImportForm";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { GeoMetadataTable } from "./GeoMetadataTable";
import type { UseFormReturn } from "react-hook-form";
import type { ImportFormData } from "@/features/data/services/forms/importSchema";
import type { TFunction } from "i18next";

function initFieldSettings(metadata: GeoFileMetadata): Record<string, GeoFieldImportSettings> {
  const fields = metadata.layers[0]?.fields ?? [];
  return Object.fromEntries(fields.map((f) => [f.name, { include: true, index: false }]));
}

interface PanelHeaderProps {
  fileName: string;
  onClose: () => void;
}

function PanelHeader({ fileName, onClose }: PanelHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold truncate">{fileName}</span>
      <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("data.load.postgis.close")}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

type LayerNameFieldProps = {
  form: UseFormReturn<ImportFormData>;
  isPending: boolean;
  t: TFunction;
};

function LayerNameField({ form, isPending, t }: LayerNameFieldProps) {
  return (
    <FormField control={form.control} name="layerName" render={({ field }) => (
      <FormItem>
        <FormLabel>{t("data.load.postgis.layerName")}</FormLabel>
        <FormControl>
          <Input
            {...field}
            disabled={isPending}
            placeholder={t("data.load.postgis.layerNamePlaceholder")}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}

interface ImportActionsProps {
  onCancel: () => void;
  onSubmitPostgis: () => void;
  onSubmitPmtiles: () => void;
  disabled: boolean;
  t: TFunction;
}

function ImportActions({ onCancel, onSubmitPostgis, onSubmitPmtiles, disabled, t }: ImportActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" type="button" onClick={onCancel}>
        {t("data.load.postgis.cancel")}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" disabled={disabled}>
            {t("data.load.postgis.export")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onSubmitPostgis}>
            {t("data.load.postgis.submitPostgis")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onSubmitPmtiles}>
            {t("data.load.postgis.submitPmtiles")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface GeoImportPanelProps {
  metadata: GeoFileMetadata;
  file: File;
  onClose: () => void;
}

export function GeoImportPanel({ metadata, file, onClose }: GeoImportPanelProps) {
  const { t } = useTranslation();
  const [fieldSettings, setFieldSettings] = useState<Record<string, GeoFieldImportSettings>>(
    () => initFieldSettings(metadata)
  );

  const errors = validateLayerMetadata(metadata);
  const hasMetadataErrors = Object.keys(errors).length > 0;
  const hasNoFieldSelected = Object.values(fieldSettings).every((s) => !s.include);

  const { form, onSubmitPostgis, onSubmitPmtiles } = useGeoImportForm({ metadata, file, fieldSettings });

  const handleFieldChange = (fieldName: string, key: keyof GeoFieldImportSettings, value: boolean) => {
    setFieldSettings((prev) => ({ ...prev, [fieldName]: { ...prev[fieldName], [key]: value } }));
  };

  const handleToggleAllInclude = (include: boolean) => {
    setFieldSettings((prev) =>
      Object.fromEntries(Object.entries(prev).map(([name, s]) => [name, { ...s, include }]))
    );
  };

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4">
        <PanelHeader fileName={metadata.fileName} onClose={onClose} />
        <GeoMetadataTable
          metadata={metadata}
          errors={errors}
          fieldSettings={fieldSettings}
          onFieldSettingChange={handleFieldChange}
          onToggleAllInclude={handleToggleAllInclude}
        />
        <div className="flex flex-col gap-3 border-t pt-4">
          <LayerNameField form={form} isPending={false} t={t} />
          <ImportActions
            onCancel={onClose}
            onSubmitPostgis={onSubmitPostgis}
            onSubmitPmtiles={onSubmitPmtiles}
            disabled={hasMetadataErrors || !form.formState.isValid || hasNoFieldSelected}
            t={t}
          />
        </div>
      </form>
    </Form>
  );
}
