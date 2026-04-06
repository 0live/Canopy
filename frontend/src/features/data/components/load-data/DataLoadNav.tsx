import { DATA_LOAD_TABS, DataLoadTab } from "@/features/data/types";
import { useTranslation } from "react-i18next";

interface DataLoadNavProps {
  active: DataLoadTab;
  onChange: (tab: DataLoadTab) => void;
}

export function DataLoadNav({ active, onChange }: DataLoadNavProps) {
  const { t } = useTranslation();

  return (
    <nav className="flex border-b overflow-x-auto">
      {DATA_LOAD_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === tab
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t(`data.load.tabs.${tab}`)}
        </button>
      ))}
    </nav>
  );
}
