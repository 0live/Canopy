import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import type { User } from "@/features/auth/types";
import type { TFunction } from "i18next";
import type { UseFormReturn } from "react-hook-form";
import { useIdentityForm } from "../../hooks/profile/useIdentityForm";
import { usePasswordForm } from "../../hooks/profile/usePasswordForm";
import type { IdentityFormData } from "../../services/forms/identitySchema";
import type { PasswordFormData } from "../../services/forms/passwordSchema";

export function ProfilePanel() {
  const { data: currentUser } = useCurrentUser();

  if (!currentUser) return null;

  return (
    <div className="space-y-8">
      <IdentityForm currentUser={currentUser} />
      <PasswordForm currentUser={currentUser} />
    </div>
  );
}

function IdentityForm({ currentUser }: { currentUser: User }) {
  const { form, onSubmit, isPending, t } = useIdentityForm(currentUser);
  const serverError = form.formState.errors.root?.serverError;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6 max-w-md">
        <IdentitySection form={form} isPending={isPending} t={t} />
        {serverError && <p className="text-sm font-medium text-destructive">{serverError.message}</p>}
        <Button type="submit" disabled={isPending}>
          {isPending ? "..." : t("profile.saveChanges")}
        </Button>
      </form>
    </Form>
  );
}

function PasswordForm({ currentUser }: { currentUser: User }) {
  const { form, onSubmit, isPending, t } = usePasswordForm(currentUser);
  const serverError = form.formState.errors.root?.serverError;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6 max-w-md">
        <PasswordSection form={form} isPending={isPending} t={t} />
        {serverError && <p className="text-sm font-medium text-destructive">{serverError.message}</p>}
        <Button type="submit" disabled={isPending}>
          {isPending ? "..." : t("profile.saveChanges")}
        </Button>
      </form>
    </Form>
  );
}

type IdentitySectionProps = { form: UseFormReturn<IdentityFormData>; isPending: boolean; t: TFunction };

function IdentitySection({ form, isPending, t }: IdentitySectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        {t("profile.identitySection")}
      </h3>
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
    </div>
  );
}

type PasswordSectionProps = { form: UseFormReturn<PasswordFormData>; isPending: boolean; t: TFunction };

function PasswordSection({ form, isPending, t }: PasswordSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {t("profile.passwordSection")}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{t("profile.passwordOptionalHint")}</p>
      </div>
      <FormField
        control={form.control}
        name="currentPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("profile.currentPassword")}</FormLabel>
            <FormControl>
              <Input type="password" disabled={isPending} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("auth.newPassword")}</FormLabel>
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
            <FormLabel>{t("profile.confirmPassword")}</FormLabel>
            <FormControl>
              <Input type="password" disabled={isPending} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
