import { cn } from "@/shared/lib/utils";
import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const ACCEPTED_EXTENSIONS = ".geojson,.json,.zip";
const ACCEPTED_MIME_TYPES = ["application/geo+json", "application/json", "application/zip"];

interface GeoFileInputProps {
  disabled?: boolean;
  onChange: (file: File) => void;
}

function isAcceptedFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return (
    ACCEPTED_MIME_TYPES.includes(file.type) ||
    ["geojson", "json", "zip"].includes(ext)
  );
}

export function GeoFileInput({ disabled, onChange }: GeoFileInputProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelected = (file: File) => {
    if (!isAcceptedFile(file)) return;
    onChange(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        disabled={disabled}
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
          "text-sm text-muted-foreground cursor-pointer",
          "hover:border-primary/60 hover:bg-muted/40",
          isDragging && "border-primary bg-primary/5 text-primary",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <UploadCloud className={cn("h-8 w-8", isDragging ? "text-primary" : "text-muted-foreground")} />
        <span className="font-medium">
          {isDragging
            ? t("data.load.postgis.dropzoneActive")
            : t("data.load.postgis.dropzone")}
        </span>
      </button>
      <p className="text-xs text-muted-foreground text-center">
        {t("data.load.postgis.supportedFormats")}
      </p>
    </div>
  );
}
