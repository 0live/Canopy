import { Database, Globe, Layers, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavRoute {
  /** i18n translation key for the route title */
  titleKey: string;
  url: string;
  icon: LucideIcon;
  requiresAdmin?: boolean;
}

export const navRoutes: NavRoute[] = [
  {
    titleKey: "nav.atlas",
    url: "/atlas",
    icon: Globe,
  },
  {
    titleKey: "nav.tileFlux",
    url: "/tile-flux",
    icon: Layers,
  },
  {
    titleKey: "nav.data",
    url: "/data",
    icon: Database,
  },
  {
    titleKey: "nav.admin",
    url: "/admin",
    icon: ShieldCheck,
    requiresAdmin: true,
  },
];
