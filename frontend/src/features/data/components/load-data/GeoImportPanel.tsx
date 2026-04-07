import { useState } from "react";
import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import type { GeoFileMetadata, GeoFieldImportSettings, GeoMetadataErrors } from "@/features/data/types";
import { validateLayerMetadata } from "@/features/data/services/load-data/medataUtils";
import { useGeoImportForm } from "@/features/data/hooks/useGeoImportForm";
import type { GeoFileUploadState } from "@/features/data/hooks/useGeoFileUpload";
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

interface FormBlockerErrorsProps {
  metadataErrors: GeoMetadataErrors;
  hasNoFieldSelected: boolean;
  isLayerNameEmpty: boolean;
  t: TFunction;
}

function FormBlockerErrors({ metadataErrors, hasNoFieldSelected, isLayerNameEmpty, t }: FormBlockerErrorsProps) {
  const messages = [
    ...Object.values(metadataErrors).map((key) => t(key!)),
    ...(hasNoFieldSelected ? [t("data.load.postgis.validation.noFieldSelected")] : []),
    ...(isLayerNameEmpty ? [t("data.load.postgis.validation.layerNameRequired")] : []),
  ];
  if (messages.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {messages.map((msg) => (
        <li key={msg} className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {msg}
        </li>
      ))}
    </ul>
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

interface UploadProgressSectionProps {
  progress: number;
  t: TFunction;
}

function UploadProgressSection({ progress, t }: UploadProgressSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted-foreground">
        {t("data.load.postgis.upload.uploading", { percent: progress })}
      </span>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface UploadSuccessSectionProps {
  filename: string;
  onClose: () => void;
  t: TFunction;
}

function UploadSuccessSection({ filename, onClose, t }: UploadSuccessSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>{t("data.load.postgis.upload.success", { filename })}</span>
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={onClose}>
          {t("data.load.postgis.upload.done")}
        </Button>
      </div>
    </div>
  );
}

interface UploadErrorSectionProps {
  onRetry: () => void;
  onCancel: () => void;
  t: TFunction;
}

function UploadErrorSection({ onRetry, onCancel, t }: UploadErrorSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{t("data.load.postgis.upload.error")}</span>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={onCancel}>
          {t("data.load.postgis.cancel")}
        </Button>
        <Button type="button" onClick={onRetry}>
          {t("data.load.postgis.upload.retry")}
        </Button>
      </div>
    </div>
  );
}

interface FormFooterProps {
  uploadState: GeoFileUploadState;
  metadataErrors: GeoMetadataErrors;
  hasNoFieldSelected: boolean;
  isLayerNameEmpty: boolean;
  isFormValid: boolean;
  onCancel: () => void;
  onSubmitPostgis: () => void;
  onSubmitPmtiles: () => void;
  onRetry: () => void;
  t: TFunction;
}

function FormFooter({
  uploadState, metadataErrors, hasNoFieldSelected, isLayerNameEmpty,
  isFormValid, onCancel, onSubmitPostgis, onSubmitPmtiles, onRetry, t,
}: FormFooterProps) {
  if (uploadState.isPending) return <UploadProgressSection progress={uploadState.progress} t={t} />;
  if (uploadState.isSuccess && uploadState.result) {
    return <UploadSuccessSection filename={uploadState.result.filename} onClose={onCancel} t={t} />;
  }
  return (
    <>
      <FormBlockerErrors
        metadataErrors={metadataErrors}
        hasNoFieldSelected={hasNoFieldSelected}
        isLayerNameEmpty={isLayerNameEmpty}
        t={t}
      />
      {uploadState.isError && (
        <UploadErrorSection onRetry={onRetry} onCancel={onCancel} t={t} />
      )}
      {!uploadState.isError && (
        <ImportActions
          onCancel={onCancel}
          onSubmitPostgis={onSubmitPostgis}
          onSubmitPmtiles={onSubmitPmtiles}
          disabled={Object.keys(metadataErrors).length > 0 || !isFormValid || hasNoFieldSelected}
          t={t}
        />
      )}
    </>
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
  const hasNoFieldSelected = Object.values(fieldSettings).every((s) => !s.include);

  const { form, onSubmitPostgis, onSubmitPmtiles, uploadState, resetUpload } =
    useGeoImportForm({ metadata, file, fieldSettings });

  const layerName = useWatch({ control: form.control, name: "layerName" });

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
          <LayerNameField form={form} isPending={uploadState.isPending} t={t} />
          <FormFooter
            uploadState={uploadState}
            metadataErrors={errors}
            hasNoFieldSelected={hasNoFieldSelected}
            isLayerNameEmpty={!layerName}
            isFormValid={form.formState.isValid}
            onCancel={onClose}
            onSubmitPostgis={onSubmitPostgis}
            onSubmitPmtiles={onSubmitPmtiles}
            onRetry={resetUpload}
            t={t}
          />
        </div>
      </form>
    </Form>
  );
}
