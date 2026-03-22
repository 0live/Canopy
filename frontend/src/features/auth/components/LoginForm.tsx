import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../../shared/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLoginForm } from "../hooks/useLoginForm";
import type { UseFormReturn } from "react-hook-form";
import type { LoginFormData } from "../services/form/loginSchema";
import type { TFunction } from "i18next";

interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
}

export function LoginForm({ onSuccess, onForgotPassword }: LoginFormProps) {
  const { form, onSubmit, isPending, t } = useLoginForm(onSuccess);
  const serverError = form.formState.errors.root?.serverError?.message;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <UsernameField form={form} isPending={isPending} t={t} />
        <PasswordField form={form} isPending={isPending} t={t} onForgotPassword={onForgotPassword} />
        <ActionButtons isPending={isPending} serverError={serverError} t={t} />
      </form>
    </Form>
  );
}

type FieldProps = { form: UseFormReturn<LoginFormData>; isPending: boolean; t: TFunction };

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

type PasswordFieldProps = FieldProps & { onForgotPassword?: () => void };

function PasswordField({ form, isPending, t, onForgotPassword }: PasswordFieldProps) {
  return (
    <FormField control={form.control} name="password" render={({ field }) => (
      <FormItem>
        <div className="flex items-center justify-between">
          <FormLabel>{t("auth.password")}</FormLabel>
          {onForgotPassword && (
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {t("auth.forgotPassword")}
            </button>
          )}
        </div>
        <FormControl><Input type="password" disabled={isPending} {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}

function ActionButtons({ isPending, serverError, t }: { isPending: boolean; serverError?: string; t: TFunction }) {
  return (
    <>
      {serverError && <div className="text-sm font-medium text-destructive">{serverError}</div>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "..." : t("auth.login")}
      </Button>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Où</span>
        </div>
      </div>
      <Button type="button" variant="outline" className="w-full" disabled>{t("auth.googleLogin")}</Button>
    </>
  );
}
