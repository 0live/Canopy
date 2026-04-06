import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";

const ACCEPTED_EXTENSIONS = ".geojson,.json,.fgb,.zip";

interface GeoFileInputProps {
  disabled?: boolean;
  onChange: (file: File) => void;
}

export function GeoFileInput({ disabled, onChange }: GeoFileInputProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onChange(file);
    // Reset so same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        disabled={disabled}
        onChange={handleChange}
      />
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {t("data.load.postgis.selectFile")}
      </Button>
      <p className="text-xs text-muted-foreground">
        {t("data.load.postgis.supportedFormats", { formats: ACCEPTED_EXTENSIONS })}
      </p>
    </div>
  );
}
