import { useTranslation } from "react-i18next";
import { SetupRootUserForm } from "../components/SetupRootUserForm";

export function SetupRootUserPage() {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">{t("setupRootUser.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("setupRootUser.description")}</p>
      </div>
      <SetupRootUserForm />
    </div>
  );
}
