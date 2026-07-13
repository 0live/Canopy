import { yupResolver } from "@hookform/resolvers/yup";
import type { User } from "@/features/auth/types";
import { isAxiosError } from "axios";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { getIdentitySchema } from "../../services/forms/identitySchema";
import type { IdentityFormData } from "../../services/forms/identitySchema";
import type { UserUpdatePayload } from "../../types";
import { useUpdateProfile } from "./useUpdateProfile";

export function useIdentityForm(currentUser: User) {
  const { t } = useTranslation();
  const schema = useMemo(() => getIdentitySchema(t), [t]);
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const form = useForm<IdentityFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      username: currentUser.username,
      email: currentUser.email,
    },
  });

  const buildPayload = (values: IdentityFormData): UserUpdatePayload => {
    const payload: UserUpdatePayload = {};
    if (values.username !== currentUser.username) payload.username = values.username;
    if (values.email !== currentUser.email) payload.email = values.email;
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
    updateProfile({ userId: currentUser.id, payload }, { onError: handleError });
  });

  return { form, onSubmit, isPending, t };
}
