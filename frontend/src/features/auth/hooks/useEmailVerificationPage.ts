import { useToast } from "@/shared/hooks/useToast";
import { useAppStore } from "@/shared/store";
import { ToastType } from "@/shared/types/Toast";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

export function useEmailVerificationPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const verifyingStatus = useAppStore((state) => state.verifyingStatus);

  const isError = verifyingStatus === "error";

  useEffect(() => {
    if (useAppStore.getState().verifyingStatus !== "success") return;

    showToast(t("auth.verificationSuccess"), ToastType.Success);
    navigate("/");

    return () => {
      useAppStore.getState().setVerifyingStatus(null);
    };
  }, [verifyingStatus, navigate, showToast, t]);

  return { isError, t };
}
