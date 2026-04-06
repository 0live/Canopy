import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCanWithDbAccess } from "@/features/auth/hooks/useAuth";
import { useAppStore } from "@/shared/store";
import { useTranslation } from "react-i18next";
import { DbAccessPanel } from "../components/dbAccess/DbAccessPanel";
import { NotificationsPanel } from "../components/notifications/NotificationsPanel";
import { ProfilePanel } from "../components/profile/ProfilePanel";
import { useMarkAllRead } from "../hooks/notifications/useMarkAllRead";

export function ProfilePage() {
  const { t } = useTranslation();
  const { mutate: markAllRead } = useMarkAllRead();
  const setUnreadCount = useAppStore((s) => s.setUnreadCount);
  const hasDbAccess = useCanWithDbAccess();

  const handleNotificationsTabSelect = () => {
    markAllRead();
    setUnreadCount(0);
  };

  return (
    <div className="w-full max-w-4xl">
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t("notifications.profileTab")}</TabsTrigger>
          {hasDbAccess && (
            <TabsTrigger value="dbAccess">{t("dbAccess.tab")}</TabsTrigger>
          )}
          <TabsTrigger value="notifications" onClick={handleNotificationsTabSelect}>
            {t("notifications.tab")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfilePanel />
        </TabsContent>
        {hasDbAccess && (
          <TabsContent value="dbAccess">
            <DbAccessPanel />
          </TabsContent>
        )}
        <TabsContent value="notifications">
          <div className="pt-4">
            <NotificationsPanel />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
