import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";

export function ForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">{t("auth.forgotPasswordTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("auth.forgotPasswordDescription")}
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-sm">
        <Link to="/" className="text-muted-foreground underline-offset-4 hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </p>
    </div>
  );
}
