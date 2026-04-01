import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Input } from "@/components/ui/input";
import type { TFunction } from "i18next";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useActivateForm } from "../../hooks/dbAccess/useActivateForm";
import { useDbAccessStatus } from "../../hooks/dbAccess/useDbAccessStatus";
import { useUpdatePasswordForm } from "../../hooks/dbAccess/useUpdatePasswordForm";
import type { DbPasswordFormData } from "../../services/forms/dbAccessSchema";

export function DbAccessPanel() {
  const { t } = useTranslation();
  const { data: status, isLoading } = useDbAccessStatus();

  if (isLoading) return null;
  if (!status) return null;

  return (
    <div className="space-y-6 pt-4 max-w-md">
      {status.is_activated ? (
        <ActiveSection roleName={status.role_name!} t={t} />
      ) : (
        <ActivateSection t={t} />
      )}
    </div>
  );
}

function ActiveSection({ roleName, t }: { roleName: string; t: TFunction }) {
  return (
    <>
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {t("dbAccess.statusSection")}
        </h3>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t("dbAccess.roleNameLabel")}</p>
            <p className="font-mono text-sm font-medium">{roleName}</p>
          </div>
          <Badge variant="default" className="bg-green-600 hover:bg-green-600">
            {t("dbAccess.activeStatus")}
          </Badge>
        </div>
      </div>
      <UpdatePasswordForm t={t} />
    </>
  );
}

function ActivateSection({ t }: { t: TFunction }) {
  const { form, onSubmit, isPending } = useActivateForm();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {t("dbAccess.activateTitle")}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{t("dbAccess.activateDescription")}</p>
      </div>
      <DbPasswordForm form={form} onSubmit={onSubmit} isPending={isPending} submitLabel={t("dbAccess.activateButton")} t={t} />
    </div>
  );
}

function UpdatePasswordForm({ t }: { t: TFunction }) {
  const { form, onSubmit, isPending } = useUpdatePasswordForm();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        {t("dbAccess.updatePasswordTitle")}
      </h3>
      <DbPasswordForm form={form} onSubmit={onSubmit} isPending={isPending} submitLabel={t("dbAccess.updatePasswordButton")} t={t} />
    </div>
  );
}

type DbPasswordFormProps = {
  form: UseFormReturn<DbPasswordFormData>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  submitLabel: string;
  t: TFunction;
};

function DbPasswordForm({ form, onSubmit, isPending, submitLabel, t }: DbPasswordFormProps) {
  const serverError = form.formState.errors.root?.serverError;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("dbAccess.passwordLabel")}</FormLabel>
              <FormControl>
                <Input type="password" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="text-xs text-muted-foreground">{t("auth.passwordMinLength", { length: 12 })}</p>
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.confirmPassword")}</FormLabel>
              <FormControl>
                <Input type="password" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {serverError && (
          <p className="text-sm font-medium text-destructive">{serverError.message}</p>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
