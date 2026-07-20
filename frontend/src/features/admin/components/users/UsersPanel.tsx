import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/useAuth";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminUsers } from "../../hooks/users/useAdminUsers";
import type { AdminUserSummary } from "../../types";
import { AdminPagination } from "../AdminPagination";
import { CreateUserDialog } from "./CreateUserDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { UserRoleDialog } from "./UserRoleDialog";
import { UsersTable } from "./UsersTable";

export function UsersPanel() {
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const { users, total, page, pageSize, setPage, isLoading, isFetching, isError } =
    useAdminUsers();

  const [editingUser, setEditingUser] = useState<AdminUserSummary | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUserSummary | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (isError) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>{t("admin.users.addUser")}</Button>
      </div>
      <UsersTable
        users={users}
        isLoading={isLoading}
        currentUserId={currentUser?.id ?? -1}
        onEditRoles={setEditingUser}
        onDelete={setDeletingUser}
      />
      <AdminPagination
        page={page}
        pageSize={pageSize}
        total={total}
        isFetching={isFetching}
        onPageChange={setPage}
      />
      {editingUser && (
        <UserRoleDialog
          user={editingUser}
          currentUserId={currentUser?.id ?? -1}
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
      {deletingUser && (
        <DeleteUserDialog
          user={deletingUser}
          open={!!deletingUser}
          onClose={() => setDeletingUser(null)}
        />
      )}
      {isCreateOpen && (
        <CreateUserDialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      )}
    </div>
  );
}
