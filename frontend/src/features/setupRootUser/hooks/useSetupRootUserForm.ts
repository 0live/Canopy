import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMemo } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { useToast } from "@/shared/hooks/useToast";
import { ToastType } from "@/shared/types/Toast";
import { useCompleteRootUserSetup } from "./useSetupRootUser";
import { getSetupRootUserSchema } from "../services/form/setupRootUserSchema";
import type { SetupRootUserFormData } from "../services/form/setupRootUserSchema";

export function useSetupRootUserForm() {
  const { t } = useTranslation();
  const { mutate: completeSetup, isPending } = useCompleteRootUserSetup();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const schema = useMemo(() => getSetupRootUserSchema(t), [t]);

  const form = useForm<SetupRootUserFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: "", username: "", password: "" },
  });

  const handleError = (err: unknown) => {
    const key = isAxiosError(err) ? err.response?.data?.key : undefined;
    const message =
      key === "setup_root_user.token_invalid"
        ? t("setupRootUser.tokenInvalid")
        : key === "setup_root_user.already_completed"
          ? t("setupRootUser.alreadyCompleted")
          : t("auth.genericError");
    form.setError("root.serverError", { type: "server", message: message as string });
  };

  const onSubmit = form.handleSubmit((values) => {
    completeSetup(
      { token, ...values },
      {
        onSuccess: () => {
          showToast(t("setupRootUser.success"), ToastType.Success);
          navigate("/");
        },
        onError: handleError,
      }
    );
  });

  return { form, onSubmit, isPending, t };
}
