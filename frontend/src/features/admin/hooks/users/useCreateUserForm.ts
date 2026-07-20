import { yupResolver } from "@hookform/resolvers/yup";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { UserRole } from "@/shared/types/UserRole";
import {
  getCreateUserSchema,
  type CreateUserFormData,
} from "../../services/forms/createUserSchema";
import { useCreateUser } from "./useCreateUser";

export function useCreateUserForm(onSuccess?: () => void) {
  const { t } = useTranslation();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([UserRole.USER]);
  const schema = useMemo(() => getCreateUserSchema(t), [t]);

  const form = useForm<CreateUserFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: "", username: "", password: "" },
  });

  const { mutate: createUser, isPending } = useCreateUser(() => {
    form.reset();
    setSelectedRoles([UserRole.USER]);
    onSuccess?.();
  });

  const toggleRole = (role: string) =>
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );

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

  const onSubmit = form.handleSubmit((values) =>
    createUser({ ...values, roles: selectedRoles }, { onError: handleError })
  );

  return { form, onSubmit, isPending, selectedRoles, toggleRole, t };
}
