import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";

export function ErrorView() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // React Router provides structured error objects for loader/action failures
  const errorMessage = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : String(error);

  return (
    <div className="flex flex-col flex-1 items-center justify-center w-full h-screen p-10 space-y-12">
      {/* Visual section: mirrors WipView layout with destructive color */}
      <div className="relative flex items-center justify-center">
        <Spinner className="absolute h-24 w-24 text-destructive/20" />
        <div className="relative z-10 rounded-full border bg-muted/50 p-6 shadow-inner">
          <TriangleAlert className="h-12 w-12 text-destructive" strokeWidth={1} />
        </div>
      </div>

      {/* Text section */}
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl md:text-6xl">
          {t("error.title")}
        </h1>
        <p className="mx-auto max-w-175 text-lg text-muted-foreground sm:text-xl">
          {t("error.subtitle")}
        </p>
      </div>

      {/* Dev-only error detail */}
      {import.meta.env.DEV && (
        <pre className="mx-auto w-fit rounded-md border bg-muted px-4 py-2 text-sm text-muted-foreground">
          {errorMessage}
        </pre>
      )}

      {/* Recovery actions */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          {t("error.retry")}
        </Button>
        <Button onClick={() => navigate("/")}>
          {t("error.goHome")}
        </Button>
      </div>
    </div>
  );
}
