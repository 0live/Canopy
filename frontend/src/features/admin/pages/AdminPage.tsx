import { PageHeader } from "@/shared/components/ui/PageHeader";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { AdminNav } from "../components/AdminNav";

export function AdminPage() {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-6xl flex flex-col gap-6 min-w-0">
      <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} />
      <AdminNav />
      <Outlet />
    </div>
  );
}
