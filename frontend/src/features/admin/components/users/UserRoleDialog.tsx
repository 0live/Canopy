import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserRole } from "@/shared/types/UserRole";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateUserRoles } from "../../hooks/users/useUpdateUserRoles";
import { type AdminUserSummary } from "../../types";
import { RoleCheckboxList } from "./RoleCheckboxList";

interface UserRoleDialogProps {
  user: AdminUserSummary;
  currentUserId: number;
  open: boolean;
  onClose: () => void;
}

export function UserRoleDialog({ user, currentUserId, open, onClose }: UserRoleDialogProps) {
  const { t } = useTranslation();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles);
  const { mutate: updateRoles, isPending } = useUpdateUserRoles(onClose);
  const isSelf = user.id === currentUserId;

  const toggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = () => updateRoles({ userId: user.id, roles: selectedRoles });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t("admin.users.editRolesTitle", { username: user.username })}
          </DialogTitle>
        </DialogHeader>
        <RoleCheckboxList
          selectedRoles={selectedRoles}
          onToggle={toggle}
          disabledRoles={isSelf ? [UserRole.ADMIN] : []}
        />
        {isSelf && (
          <p className="text-sm text-muted-foreground">
            {t("admin.users.cannotEditOwnAdminRole")}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t("admin.users.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {t("admin.users.saveRoles")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
