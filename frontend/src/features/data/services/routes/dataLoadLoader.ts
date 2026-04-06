import { queryClient } from "@/app/config/queryClient";
import { canLoadData } from "@/features/auth/hooks/useAuth";
import { type User } from "@/features/auth/types";
import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { useAppStore } from "@/shared/store";
import { redirect } from "react-router";

export const dataLoadLoader = () => {
  const accessToken = useAppStore.getState().accessToken;
  if (!accessToken) return redirect("/");

  const user = queryClient.getQueryData<User>(QUERY_KEYS.AUTH.CURRENT_USER());
  if (!canLoadData(user)) return redirect("/data");

  return null;
};
