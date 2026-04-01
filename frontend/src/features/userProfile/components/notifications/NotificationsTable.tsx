import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatNotificationMessage } from "../../services/utils/formatNotificationMessage";
import type { NotificationType as NotificationTypeValue, NotificationsTableProps } from "../../types";

const TYPE_ICONS: Record<NotificationTypeValue, React.ReactNode> = {
  INFO: <Info className="h-4 w-4 text-blue-500" />,
  SUCCESS: <CheckCircle className="h-4 w-4 text-green-500" />,
  WARNING: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  ERROR: <XCircle className="h-4 w-4 text-red-500" />,
};

export function NotificationsTable({
  notifications,
  selectedIds,
  onToggle,
  onToggleAll,
}: NotificationsTableProps) {
  const { t } = useTranslation();
  const allSelected =
    notifications.length > 0 && selectedIds.size === notifications.length;

  return (
    <Table className="py-3">
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => onToggleAll(!!checked)}
            />
          </TableHead>
          <TableHead className="w-10" />
          <TableHead>{t("notifications.message")}</TableHead>
          <TableHead>{t("notifications.date")}</TableHead>
          <TableHead>{t("notifications.status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notifications.map((n) => (
          <TableRow key={n.id} className={n.is_read ? "opacity-60" : ""}>
            <TableCell>
              <Checkbox
                checked={selectedIds.has(n.id)}
                onCheckedChange={() => onToggle(n.id)}
              />
            </TableCell>
            <TableCell>{TYPE_ICONS[n.type]}</TableCell>
            <TableCell>{formatNotificationMessage(n, t)}</TableCell>
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
              {new Date(n.created_at).toLocaleString()}
            </TableCell>
            <TableCell>
              <Badge variant={n.is_read ? "secondary" : "default"}>
                {n.is_read ? t("notifications.read") : t("notifications.unread")}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
