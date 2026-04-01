import { Button } from "@/shared/components/ui/button";
import type { TFunction } from "i18next";
import { TriangleAlert } from "lucide-react";

interface VerificationErrorProps {
  onGoToLogin: () => void;
  t: TFunction;
}

export function VerificationError({ onGoToLogin, t }: VerificationErrorProps) {

  return (
    <div className="flex flex-col flex-1 items-center justify-center w-full h-screen p-10 space-y-12">
      <div className="relative flex items-center justify-center">
        <div className="relative z-10 rounded-full border bg-muted/50 p-6 shadow-inner">
          <TriangleAlert className="h-12 w-12 text-destructive" strokeWidth={1} />
        </div>
      </div>
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">
          {t("auth.verificationFailed")}
        </h1>
        <p className="mx-auto max-w-175 text-lg text-muted-foreground sm:text-xl">
          {t("auth.verificationErrorSubtitle")}
        </p>
      </div>
      <Button onClick={onGoToLogin}>
        {t("auth.goToLogin")}
      </Button>
    </div>
  );
}