import { useAppStore } from "@/shared/store";
import { redirect } from "react-router";

export const profileLoader = () => {
  const accessToken = useAppStore.getState().accessToken;
  if (!accessToken) return redirect("/");
  return null;
};
