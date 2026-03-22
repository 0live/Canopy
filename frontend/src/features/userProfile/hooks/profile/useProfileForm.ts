import { yupResolver } from "@hookform/resolvers/yup";
import type { User } from "@/features/auth/types";
import { isAxiosError } from "axios";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { getProfileSchema } from "../../services/forms/profileSchema";
import type { ProfileFormData } from "../../services/forms/profileSchema";
import type { UserUpdatePayload } from "../../types";
import { useUpdateProfile } from "./useUpdateProfile";

export function useProfileForm(currentUser: User) {
  const { t } = useTranslation();
  const schema = useMemo(() => getProfileSchema(t), [t]);
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const form = useForm<ProfileFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      username: currentUser.username,
      email: currentUser.email,
      password: "",
      confirmPassword: "",
    },
  });

  const buildPayload = (values: ProfileFormData): UserUpdatePayload => {
    const payload: UserUpdatePayload = {};
    if (values.username !== currentUser.username) payload.username = values.username;
    if (values.email !== currentUser.email) payload.email = values.email;
    if (values.password) payload.password = values.password;
    return payload;
  };

  const handleError = (err: unknown) => {
    if (isAxiosError(err) && err.response?.data?.key) {
      const { key, params } = err.response.data;
      if (key === "user.email_exists")
        return form.setError("email", { type: "server", message: t(key, params) as string });
      if (key === "user.username_exists")
        return form.setError("username", { type: "server", message: t(key, params) as string });
    }
    form.setError("root.serverError", { type: "server", message: t("auth.genericError") as string });
  };

  const onSubmit = form.handleSubmit((values) => {
    const payload = buildPayload(values);
    if (Object.keys(payload).length === 0) return;
    updateProfile(
      { userId: currentUser.id, payload },
      {
        onSuccess: () => {
          form.setValue("password", "");
          form.setValue("confirmPassword", "");
        },
        onError: handleError,
      }
    );
  });

  return { form, onSubmit, isPending, t };
}
