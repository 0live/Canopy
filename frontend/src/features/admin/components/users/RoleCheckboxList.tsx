import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { UserRole } from "@/shared/types/UserRole";
import { useTranslation } from "react-i18next";

interface RoleCheckboxListProps {
  selectedRoles: string[];
  onToggle: (role: string) => void;
  disabledRoles?: string[];
}

export function RoleCheckboxList({
  selectedRoles,
  onToggle,
  disabledRoles = [],
}: RoleCheckboxListProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 py-2">
      {Object.values(UserRole).map((role) => (
        <div key={role} className="flex items-center gap-3">
          <Checkbox
            id={role}
            checked={selectedRoles.includes(role)}
            onCheckedChange={() => onToggle(role)}
            disabled={disabledRoles.includes(role)}
          />
          <Label htmlFor={role} className="font-normal cursor-pointer">
            {t(`admin.users.roleLabels.${role}`)}
          </Label>
        </div>
      ))}
    </div>
  );
}
