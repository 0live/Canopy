import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const setupRootUserLoader = ({ request }: LoaderFunctionArgs) => {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return redirect("/");
  }

  return null;
};
