import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { validateLayerMetadata } from "@/features/data/services/load-data/medataUtils";
import type { GeoFileMetadata, GeoFieldImportSettings, GeoImportFormData } from "@/features/data/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { GeoMetadataTable } from "./GeoMetadataTable";

function toSnakeCase(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

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

interface PanelFooterProps {
  layerName: string;
  onLayerNameChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitDisabled: boolean;
}

function PanelFooter({ layerName, onLayerNameChange, onCancel, onSubmit, submitDisabled }: PanelFooterProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="layer-name">{t("data.load.postgis.layerName")}</Label>
        <Input
          id="layer-name"
          value={layerName}
          onChange={(e) => onLayerNameChange(e.target.value)}
          placeholder={t("data.load.postgis.layerNamePlaceholder")}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>{t("data.load.postgis.cancel")}</Button>
        <Button onClick={onSubmit} disabled={submitDisabled}>{t("data.load.postgis.submit")}</Button>
      </div>
    </div>
  );
}

interface GeoImportPanelProps {
  metadata: GeoFileMetadata;
  onClose: () => void;
}

export function GeoImportPanel({ metadata, onClose }: GeoImportPanelProps) {
  const [fieldSettings, setFieldSettings] = useState<Record<string, GeoFieldImportSettings>>(
    () => initFieldSettings(metadata)
  );
  const [layerName, setLayerName] = useState(() => toSnakeCase(metadata.layers[0]?.name ?? "layer"));

  const errors = validateLayerMetadata(metadata);
  const hasErrors = Object.keys(errors).length > 0;

  const handleFieldChange = (fieldName: string, key: keyof GeoFieldImportSettings, value: boolean) => {
    setFieldSettings((prev) => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], [key]: value },
    }));
  };

  const handleSubmit = () => {
    const formData: GeoImportFormData = { layerName, fieldSettings };
    console.log("[GeoImportPanel] submit", formData);
  };

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader fileName={metadata.fileName} onClose={onClose} />
      <GeoMetadataTable
        metadata={metadata}
        errors={errors}
        fieldSettings={fieldSettings}
        onFieldSettingChange={handleFieldChange}
      />
      <PanelFooter
        layerName={layerName}
        onLayerNameChange={setLayerName}
        onCancel={onClose}
        onSubmit={handleSubmit}
        submitDisabled={hasErrors}
      />
    </div>
  );
}
