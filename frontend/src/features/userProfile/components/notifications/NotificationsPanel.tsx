import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteNotifications } from "../../hooks/notifications/useDeleteNotifications";
import { useNotifications } from "../../hooks/notifications/useNotifications";
import { NotificationsTable } from "./NotificationsTable";

export function NotificationsPanel() {
  const { t } = useTranslation();
  const { notifications, isLoading, isError } = useNotifications();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const clearSelection = () => setSelectedIds(new Set());
  const { mutate: deleteNotifications, isPending } =
    useDeleteNotifications(clearSelection);

  const toggleId = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelectedIds(checked ? new Set(notifications.map((n) => n.id)) : new Set());

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) return null;

  if (notifications.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        {t("notifications.empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          variant="destructive"
          size="sm"
          disabled={selectedIds.size === 0 || isPending}
          onClick={() => deleteNotifications([...selectedIds])}
        >
          {t("notifications.deleteSelected")} ({selectedIds.size})
        </Button>
      </div>
      <NotificationsTable
        notifications={notifications}
        selectedIds={selectedIds}
        onToggle={toggleId}
        onToggleAll={toggleAll}
      />
    </div>
  );
}
