import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useCurrentUser, useLogout } from "@/features/auth/hooks/useAuth";
import { UnreadBadge } from "@/features/userProfile/components/notifications/UnreadBadge";
import { useAppStore } from "@/shared/store";
import { ChevronsUpDown, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { AuthDialog } from "./AuthDialog";

export function SidebarAuthFooter() {
  const { t } = useTranslation();
  const { isLoading, unreadCount } = useAppStore();
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const { mutate: logout } = useLogout();
  const { isMobile, state } = useSidebar();

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
           <SidebarMenuButton size="lg" className="opacity-50 pointer-events-none">
             Connecting...
           </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <AuthDialog>
            <SidebarMenuButton  tooltip={t("auth.login")}  size="lg" className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground">
              {state === "collapsed" ? <LogIn /> : t("auth.login")}
            </SidebarMenuButton>
          </AuthDialog>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-state-open:bg-sidebar-accent data-state-open:text-sidebar-accent-foreground"
            >
              <div className="relative">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <UnreadBadge count={unreadCount} />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.username}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.username}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2 cursor-pointer w-full">
                  <UserIcon className="h-4 w-4" />
                  {t("auth.profile")}
                </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout(undefined, { onSettled: () => navigate("/") })} className="cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              {t("auth.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
