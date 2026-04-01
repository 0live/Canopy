import { useNavigate } from "react-router";
import { VerificationError } from "../components/VerificationError";
import { useEmailVerificationPage } from "../hooks/useEmailVerificationPage";

export function EmailVerificationPage() {
  const navigate = useNavigate();
  const { isError, t } = useEmailVerificationPage();

  const handleGoToLogin = () => navigate("/");

  if (isError) return <VerificationError onGoToLogin={handleGoToLogin} t={t} />;

  return null;
}
