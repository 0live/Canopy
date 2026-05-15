import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../../shared/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRegisterForm } from "../hooks/useRegisterForm";
import { CaptchaField } from "./CaptchaField";
import type { UseFormReturn } from "react-hook-form";
import type { RegisterFormData } from "../services/form/registerSchema";
import type { TFunction } from "i18next";

export function RegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const { form, onSubmit, isPending, isSuccess, t } = useRegisterForm(onSuccess);

  if (isSuccess) return <SuccessMessage text={t("auth.registerSuccess")} />;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <EmailField form={form} isPending={isPending} t={t} />
        <UsernameField form={form} isPending={isPending} t={t} />
        <PasswordField form={form} isPending={isPending} t={t} />
        <CaptchaField form={form} />
        <ActionButtons form={form} isPending={isPending} t={t} />
      </form>
    </Form>
  );
}

function SuccessMessage({ text }: { text: string }) {
  return (
    <div className="text-center space-y-4 py-8">
      <h3 className="text-lg font-medium text-primary">{text}</h3>
    </div>
  );
}

type FieldProps = { form: UseFormReturn<RegisterFormData>; isPending: boolean; t: TFunction };

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
      <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "..." : t("auth.register")}</Button>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t("auth.or")}</span>
        </div>
      </div>
      <Button type="button" variant="outline" className="w-full" disabled>{t("auth.googleLogin")}</Button>
    </>
  );
}
