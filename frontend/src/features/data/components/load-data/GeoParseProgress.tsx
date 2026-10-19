import { useTranslation } from "react-i18next";
import { ProgressBar } from "@/features/data/components/load-data/ProgressBar";
import { Button } from "@/shared/components/ui/button";

interface GeoParseProgressProps {
  percent: number;
  onCancel: () => void;
}

export function GeoParseProgress({ percent, onCancel }: GeoParseProgressProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 py-8">
      <ProgressBar label={t("data.load.postgis.parsingProgress", { percent })} percent={percent} />
      <div className="flex justify-end">
        <Button variant="outline" type="button" onClick={onCancel}>
          {t("data.load.postgis.cancelParsing")}
        </Button>
      </div>
    </div>
  );
}
