import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { warningMessage } from "@/features/data/services/load-data/geoMessages";
import type { GeoLayerWarning } from "@/features/data/types";

interface GeoWarningListProps {
  warnings: GeoLayerWarning[];
}

/** Non-blocking findings of the parse: shown, but export stays possible */
export function GeoWarningList({ warnings }: GeoWarningListProps) {
  const { t } = useTranslation();
  if (warnings.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {warnings.map((warning) => (
        <li key={warning.code} className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
          <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
          {warningMessage(warning, t)}
        </li>
      ))}
    </ul>
  );
}
