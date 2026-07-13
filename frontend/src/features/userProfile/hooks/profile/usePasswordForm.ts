import { yupResolver } from "@hookform/resolvers/yup";
import type { User } from "@/features/auth/types";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { getPasswordSchema } from "../../services/forms/passwordSchema";
import type { PasswordFormData } from "../../services/forms/passwordSchema";
import { useUpdateProfile } from "./useUpdateProfile";

export function usePasswordForm(currentUser: User) {
  const { t } = useTranslation();
  const schema = useMemo(() => getPasswordSchema(t), [t]);
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const form = useForm<PasswordFormData>({
    resolver: yupResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const handleError = () => {
    form.setError("root.serverError", { type: "server", message: t("auth.genericError") as string });
  };

  const onSubmit = form.handleSubmit((values) => {
    updateProfile(
      { userId: currentUser.id, payload: { password: values.password } },
      {
        onSuccess: () => form.reset({ password: "", confirmPassword: "" }),
        onError: handleError,
      }
    );
  });

  return { form, onSubmit, isPending, t };
}
