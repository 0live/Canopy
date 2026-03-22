import { useTranslation } from "react-i18next";
import { ResetPasswordForm } from "../components/ResetPasswordForm";

export function ResetPasswordPage() {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">{t("auth.resetPasswordTitle")}</h1>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
