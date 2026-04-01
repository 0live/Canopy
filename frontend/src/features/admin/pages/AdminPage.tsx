import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { AdminNav } from "../components/AdminNav";

export function AdminPage() {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-6xl flex flex-col gap-6 min-w-0">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.subtitle")}</p>
      </div>
      <AdminNav />
      <Outlet />
    </div>
  );
}
