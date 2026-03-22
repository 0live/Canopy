import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserRole } from "@/shared/types/UserRole";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateUserRoles } from "../../hooks/users/useUpdateUserRoles";
import { type AdminUserSummary } from "../../types";

interface UserRoleDialogProps {
  user: AdminUserSummary;
  open: boolean;
  onClose: () => void;
}

export function UserRoleDialog({ user, open, onClose }: UserRoleDialogProps) {
  const { t } = useTranslation();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles);
  const { mutate: updateRoles, isPending } = useUpdateUserRoles(onClose);

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
        <div className="flex flex-col gap-3 py-2">
          {Object.values(UserRole).map((role) => (
            <div key={role} className="flex items-center gap-3">
              <Checkbox
                id={role}
                checked={selectedRoles.includes(role)}
                onCheckedChange={() => toggle(role)}
              />
              <Label htmlFor={role} className="font-normal cursor-pointer">
                {t(`admin.users.roleLabels.${role}`)}
              </Label>
            </div>
          ))}
        </div>
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
