import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { useState } from "react";
import { useAuthConfig } from "../hooks/useAuth";

type DialogView = "auth" | "forgot-password";

export function AuthDialog({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<DialogView>("auth");
  const { data: authConfig } = useAuthConfig();
  const canSelfRegister = authConfig?.allow_self_registration ?? false;

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setView("auth");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="sr-only">Authentication</DialogTitle>
          <DialogDescription className="sr-only">Login or create an account</DialogDescription>
        </DialogHeader>

        {view === "auth" && canSelfRegister && (
          <Tabs defaultValue="login" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
              <TabsTrigger value="register">{t("auth.register")}</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <LoginForm
                onSuccess={() => setOpen(false)}
                onForgotPassword={() => setView("forgot-password")}
              />
            </TabsContent>
            <TabsContent value="register" className="mt-4">
              <RegisterForm onSuccess={() => setOpen(false)} />
            </TabsContent>
          </Tabs>
        )}

        {view === "auth" && !canSelfRegister && (
          <div className="mt-4">
            <LoginForm
              onSuccess={() => setOpen(false)}
              onForgotPassword={() => setView("forgot-password")}
            />
          </div>
        )}

        {view === "forgot-password" && (
          <div className="mt-4 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{t("auth.forgotPasswordTitle")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("auth.forgotPasswordDescription")}
              </p>
            </div>
            <ForgotPasswordForm />
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setView("auth")}
            >
              {t("auth.backToLogin")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
