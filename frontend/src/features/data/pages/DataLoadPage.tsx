import { DataLoadNav } from "@/features/data/components/load-data/DataLoadNav";
import { GeoFilesLoadTab } from "@/features/data/components/load-data/GeoFilesLoadTab";
import { DataLoadTab } from "@/features/data/types";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Wip } from "@/shared/components/ui/Wip";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function DataLoadPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<DataLoadTab>(DataLoadTab.GEO_FILES);

  return (
    <div className="w-full max-w-6xl flex flex-col gap-6 min-w-0">
      <PageHeader
        title={t("data.load.title")}
        subtitle={t("data.load.subtitle")}
      />
      <DataLoadNav active={activeTab} onChange={setActiveTab} />
      {activeTab === DataLoadTab.GEO_FILES && <GeoFilesLoadTab />}
      {activeTab === DataLoadTab.TABULAR_FILES && <Wip />}
      {activeTab === DataLoadTab.CLOUD_SOURCE && <Wip />}
    </div>
  );
}
