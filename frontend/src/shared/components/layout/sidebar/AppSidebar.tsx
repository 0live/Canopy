import { SidebarSettings } from "@/components/layout/sidebar/SidebarSettings";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SidebarAuthFooter } from "@/features/auth/components/SidebarAuthFooter";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import canopyLogo from "@/shared/assets/logo2.svg";
import { navRoutes } from "@/shared/routes/RoutesDefinition";
import { UserRole } from "@/shared/types/UserRole";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function AppSidebar() {
  const { t } = useTranslation()
  const { data: user } = useCurrentUser()

  const visibleRoutes = navRoutes.filter(
    (route) => !route.requiresAdmin || user?.roles.includes(UserRole.ADMIN)
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/">
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center">
                  <img src={canopyLogo} alt="Canopy logo" className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-semibold">Canopy</span>
                  <span className="text-xs mt-1 text-muted-foreground">v0.0.1</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleRoutes.map((route) => (
                <SidebarMenuItem key={route.url}>
                  <SidebarMenuButton asChild tooltip={t(route.titleKey)}>
                    <Link to={route.url}>
                      <route.icon />
                      <span>{t(route.titleKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSettings />
      <SidebarFooter>
        <SidebarAuthFooter />
      </SidebarFooter>
    </Sidebar>
  )
}
