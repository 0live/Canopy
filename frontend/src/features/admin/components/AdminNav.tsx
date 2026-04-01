import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { AdminPanel, ADMIN_PANELS } from "../types";

function getActivePanel(pathname: string): AdminPanel {
  const segment = pathname.split("/").at(-1);
  return (Object.values(AdminPanel).find((p) => p === segment) ??
    AdminPanel.USERS) as AdminPanel;
}

export function AdminNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const active = getActivePanel(pathname);

  const handleChange = (panel: string) => navigate(`/admin/${panel}`);

  if (isMobile) {
    return (
      <Select value={active} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ADMIN_PANELS.map((panel) => (
            <SelectItem key={panel} value={panel}>
              {t(`admin.nav.${panel.replace("-", "")}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <nav className="flex border-b overflow-x-auto">
      {ADMIN_PANELS.map((panel) => (
        <button
          key={panel}
          onClick={() => handleChange(panel)}
          className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === panel
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t(`admin.nav.${panel.replace("-", "")}`)}
        </button>
      ))}
    </nav>
  );
}
