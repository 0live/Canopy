import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import type { User } from "@/features/auth/types";
import type { TFunction } from "i18next";
import type { UseFormReturn } from "react-hook-form";
import { useProfileForm } from "../../hooks/profile/useProfileForm";
import type { ProfileFormData } from "../../services/forms/profileSchema";

export function ProfilePanel() {
  const { data: currentUser } = useCurrentUser();

  if (!currentUser) return null;

  return <ProfileForm currentUser={currentUser} />;
}

function ProfileForm({ currentUser }: { currentUser: User }) {
  const { form, onSubmit, isPending, t } = useProfileForm(currentUser);

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6 pt-4 max-w-md">
        <IdentitySection form={form} isPending={isPending} t={t} />
        <PasswordSection form={form} isPending={isPending} t={t} />
        <SubmitSection form={form} isPending={isPending} t={t} />
      </form>
    </Form>
  );
}

type SectionProps = { form: UseFormReturn<ProfileFormData>; isPending: boolean; t: TFunction };

function IdentitySection({ form, isPending, t }: SectionProps) {
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

function PasswordSection({ form, isPending, t }: SectionProps) {
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

function SubmitSection({ form, isPending, t }: SectionProps) {
  const serverError = form.formState.errors.root?.serverError;
  return (
    <div className="space-y-2">
      {serverError && (
        <p className="text-sm font-medium text-destructive">{serverError.message}</p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "..." : t("profile.saveChanges")}
      </Button>
    </div>
  );
}
