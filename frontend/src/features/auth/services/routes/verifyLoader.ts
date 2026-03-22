import { queryClient } from "@/app/config/queryClient";
import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { useAppStore } from "@/shared/store";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authApi } from "../api/authApi";

export const verifyLoader = async ({ request }: LoaderFunctionArgs) => {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return redirect("/");
  }

  try {
    const tokens = await queryClient.fetchQuery({
      queryKey: QUERY_KEYS.AUTH.VERIFY(token),
      queryFn: () => authApi.verifyEmail(token),
    });

    useAppStore.getState().setAccessToken(tokens.access_token);

    await queryClient.fetchQuery({
      queryKey: QUERY_KEYS.AUTH.CURRENT_USER(),
      queryFn: () => authApi.fetchCurrentUser(),
    });

    useAppStore.getState().setVerifyingStatus("success");
  } catch {
    useAppStore.getState().setVerifyingStatus("error");
  }

  return null;
};
