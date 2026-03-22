import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useNotificationWebSocket } from "@/features/userProfile/hooks/notifications/useNotificationWebSocket";
import { useUnreadCount } from "@/features/userProfile/hooks/notifications/useUnreadCount";
import { Outlet } from "react-router";
import { AppSidebar } from "./sidebar/AppSidebar";

function NotificationServices() {
  useNotificationWebSocket();
  useUnreadCount();
  return null;
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <NotificationServices />
      <AppSidebar />
      <Toaster position="top-right" />
      <main className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <SidebarTrigger />
        <div className="flex flex-1 flex-col py-12 px-6 selection:bg-primary/10 items-center min-w-0 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
