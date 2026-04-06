import { useCanLoadData } from "@/features/auth/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

export function DataHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canLoadData = useCanLoadData();

  return (
    <div className="flex flex-col w-full gap-6">
      <PageHeader title={t("data.title")} subtitle={t("data.subtitle")} />

      {canLoadData && (
        <div>
          <Button onClick={() => navigate("/data/load")}>
            {t("data.loadDataButton")}
          </Button>
        </div>
      )}

      {/* TODO: liste des données chargées en base */}
    </div>
  );
}
