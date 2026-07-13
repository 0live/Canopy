import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSetupRootUserForm } from "../hooks/useSetupRootUserForm";
import type { UseFormReturn } from "react-hook-form";
import type { SetupRootUserFormData } from "../services/form/setupRootUserSchema";
import type { TFunction } from "i18next";

export function SetupRootUserForm() {
  const { form, onSubmit, isPending, t } = useSetupRootUserForm();

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <EmailField form={form} isPending={isPending} t={t} />
        <UsernameField form={form} isPending={isPending} t={t} />
        <PasswordField form={form} isPending={isPending} t={t} />
        <ActionButtons form={form} isPending={isPending} t={t} />
      </form>
    </Form>
  );
}

type FieldProps = { form: UseFormReturn<SetupRootUserFormData>; isPending: boolean; t: TFunction };

function EmailField({ form, isPending, t }: FieldProps) {
  return (
    <FormField control={form.control} name="email" render={({ field }) => (
      <FormItem>
        <FormLabel>{t("auth.email")}</FormLabel>
        <FormControl><Input type="email" disabled={isPending} {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}

function UsernameField({ form, isPending, t }: FieldProps) {
  return (
    <FormField control={form.control} name="username" render={({ field }) => (
      <FormItem>
        <FormLabel>{t("auth.username")}</FormLabel>
        <FormControl><Input type="text" disabled={isPending} {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}

function PasswordField({ form, isPending, t }: FieldProps) {
  return (
    <>
      <FormField control={form.control} name="password" render={({ field }) => (
        <FormItem>
          <FormLabel>{t("auth.password")}</FormLabel>
          <FormControl><Input type="password" disabled={isPending} {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <p className="text-xs text-muted-foreground">{t("auth.passwordMinLength", { length: 12 })}</p>
    </>
  );
}

function ActionButtons({ form, isPending, t }: FieldProps) {
  const serverError = form.formState.errors.root?.serverError;
  return (
    <>
      {serverError && <div className="text-sm font-medium text-destructive">{serverError.message}</div>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "..." : t("setupRootUser.submit")}
      </Button>
    </>
  );
}
