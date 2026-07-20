import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { TFunction } from "i18next";
import type { UseFormReturn } from "react-hook-form";
import { useCreateUserForm } from "../../hooks/users/useCreateUserForm";
import type { CreateUserFormData } from "../../services/forms/createUserSchema";
import { RoleCheckboxList } from "./RoleCheckboxList";

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateUserDialog({ open, onClose }: CreateUserDialogProps) {
  const { form, onSubmit, isPending, selectedRoles, toggleRole, t } =
    useCreateUserForm(onClose);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("admin.users.createUserTitle")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <EmailField form={form} isPending={isPending} t={t} />
            <UsernameField form={form} isPending={isPending} t={t} />
            <PasswordField form={form} isPending={isPending} t={t} />
            <RoleCheckboxList selectedRoles={selectedRoles} onToggle={toggleRole} />
            <ServerError form={form} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                {t("admin.users.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {t("admin.users.createUser")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type FieldProps = {
  form: UseFormReturn<CreateUserFormData>;
  isPending: boolean;
  t: TFunction;
};

function EmailField({ form, isPending, t }: FieldProps) {
  return (
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("auth.email")}</FormLabel>
          <FormControl>
            <Input type="email" disabled={isPending} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function UsernameField({ form, isPending, t }: FieldProps) {
  return (
    <FormField
      control={form.control}
      name="username"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("auth.username")}</FormLabel>
          <FormControl>
            <Input type="text" disabled={isPending} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function PasswordField({ form, isPending, t }: FieldProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("auth.password")}</FormLabel>
            <FormControl>
              <Input type="password" disabled={isPending} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <p className="text-xs text-muted-foreground">
        {t("auth.passwordMinLength", { length: 12 })}
      </p>
    </>
  );
}

function ServerError({ form }: { form: UseFormReturn<CreateUserFormData> }) {
  const serverError = form.formState.errors.root?.serverError;
  if (!serverError) return null;
  return <div className="text-sm font-medium text-destructive">{serverError.message}</div>;
}
