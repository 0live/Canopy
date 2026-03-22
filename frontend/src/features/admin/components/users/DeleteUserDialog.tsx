import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { useDeleteUser } from "../../hooks/users/useDeleteUser";
import type { AdminUserSummary } from "../../types";

interface DeleteUserDialogProps {
  user: AdminUserSummary;
  open: boolean;
  onClose: () => void;
}

export function DeleteUserDialog({ user, open, onClose }: DeleteUserDialogProps) {
  const { t } = useTranslation();
  const { mutate: deleteUser, isPending } = useDeleteUser(onClose);

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("admin.users.deleteConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("admin.users.deleteConfirmDescription", { username: user.username })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("admin.users.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => deleteUser(user.id)}
            disabled={isPending}
          >
            {t("admin.users.deleteUser")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
