import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../../shared/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForgotPasswordForm } from "../hooks/useForgotPasswordForm";
import type { UseFormReturn } from "react-hook-form";
import type { ForgotPasswordFormData } from "../services/form/forgotPasswordSchema";
import type { TFunction } from "i18next";

export function ForgotPasswordForm() {
  const { form, onSubmit, isPending, isSuccess, t } = useForgotPasswordForm();

  if (isSuccess) return <SuccessMessage text={t("auth.forgotPasswordSuccess")} />;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <EmailField form={form} isPending={isPending} t={t} />
        <ActionButtons form={form} isPending={isPending} t={t} />
      </form>
    </Form>
  );
}

function SuccessMessage({ text }: { text: string }) {
  return (
    <div className="text-center space-y-4 py-8">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

type FieldProps = { form: UseFormReturn<ForgotPasswordFormData>; isPending: boolean; t: TFunction };

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

function ActionButtons({ form, isPending, t }: FieldProps) {
  const serverError = form.formState.errors.root?.serverError;
  return (
    <>
      {serverError && <div className="text-sm font-medium text-destructive">{serverError.message}</div>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "..." : t("auth.forgotPasswordSubmit")}
      </Button>
    </>
  );
}
