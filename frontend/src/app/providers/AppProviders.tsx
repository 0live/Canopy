import "@/app/config/i18n";
import { DEFAULT_LOCALE, STORAGE_KEY } from "@/app/config/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "./I18nProvider";
import { QueryProvider } from "./QueryProvider";
import { STORAGE_KEY as THEME_STORAGE_KEY, ThemeProvider } from "./ThemeProvider";


export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <I18nProvider defaultLocale={DEFAULT_LOCALE} storageKey={STORAGE_KEY}>
        <ThemeProvider defaultTheme="dark" storageKey={THEME_STORAGE_KEY}>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryProvider>
  );
}
