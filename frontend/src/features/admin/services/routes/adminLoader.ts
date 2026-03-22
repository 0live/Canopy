import { queryClient } from "@/app/config/queryClient";
import { type User } from "@/features/auth/types";
import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { useAppStore } from "@/shared/store";
import { UserRole } from "@/shared/types/UserRole";
import { redirect } from "react-router";

export const adminLoader = () => {
  const accessToken = useAppStore.getState().accessToken;
  if (!accessToken) return redirect("/");

  const user = queryClient.getQueryData<User>(QUERY_KEYS.AUTH.CURRENT_USER());
  if (!user?.roles.includes(UserRole.ADMIN)) return redirect("/");

  return null;
};
