import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../../shared/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useResetPasswordForm } from "../hooks/useResetPasswordForm";
import type { UseFormReturn } from "react-hook-form";
import type { ResetPasswordFormData } from "../services/form/resetPasswordSchema";
import type { TFunction } from "i18next";

export function ResetPasswordForm() {
  const { form, onSubmit, isPending, t } = useResetPasswordForm();

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <NewPasswordField form={form} isPending={isPending} t={t} />
        <ConfirmPasswordField form={form} isPending={isPending} t={t} />
        <ActionButtons form={form} isPending={isPending} t={t} />
      </form>
    </Form>
  );
}

type FieldProps = { form: UseFormReturn<ResetPasswordFormData>; isPending: boolean; t: TFunction };

function NewPasswordField({ form, isPending, t }: FieldProps) {
  return (
    <>
      <FormField control={form.control} name="new_password" render={({ field }) => (
        <FormItem>
          <FormLabel>{t("auth.newPassword")}</FormLabel>
          <FormControl><Input type="password" disabled={isPending} {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <p className="text-xs text-muted-foreground">{t("auth.passwordMinLength", { length: 12 })}</p>
    </>
  );
}

function ConfirmPasswordField({ form, isPending, t }: FieldProps) {
  return (
    <FormField control={form.control} name="confirm_password" render={({ field }) => (
      <FormItem>
        <FormLabel>{t("auth.confirmPassword")}</FormLabel>
        <FormControl><Input type="password" disabled={isPending} {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}

function ActionButtons({ form, isPending, t }: FieldProps) {
  const serverError = form.formState.errors.root?.serverError;
  return (
    <>
      {serverError && <div className="text-sm font-medium text-destructive">{serverError.message}</div>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "..." : t("auth.resetPasswordSubmit")}
      </Button>
    </>
  );
}
