import type { TFunction } from "i18next";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ProgressBar } from "@/features/data/components/load-data/ProgressBar";
import { Button } from "@/shared/components/ui/button";

interface UploadProgressSectionProps {
  progress: number;
  t: TFunction;
}

export function UploadProgressSection({ progress, t }: UploadProgressSectionProps) {
  return <ProgressBar label={t("data.load.postgis.upload.uploading", { percent: progress })} percent={progress} />;
}

interface UploadSuccessSectionProps {
  filename: string;
  onClose: () => void;
  t: TFunction;
}

export function UploadSuccessSection({ filename, onClose, t }: UploadSuccessSectionProps) {
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

export function UploadErrorSection({ onRetry, onCancel, t }: UploadErrorSectionProps) {
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
