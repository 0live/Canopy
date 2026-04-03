import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Wip } from "@/shared/components/ui/Wip";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DataLoadNav } from "../components/DataLoadNav";
import { DataLoadTab } from "../types";

export function DataLoadPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<DataLoadTab>(DataLoadTab.POSTGIS);

  return (
    <div className="w-full max-w-6xl flex flex-col gap-6 min-w-0">
      <PageHeader
        title={t("data.load.title")}
        subtitle={t("data.load.subtitle")}
      />
      <DataLoadNav active={activeTab} onChange={setActiveTab} />
      <Wip />
    </div>
  );
}
