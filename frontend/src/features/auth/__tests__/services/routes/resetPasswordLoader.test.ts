import { resetPasswordLoader } from "@/features/auth/services/routes/resetPasswordLoader";
import type { LoaderFunctionArgs } from "react-router";

function makeArgs(url: string): LoaderFunctionArgs {
  return { request: new Request(url) } as unknown as LoaderFunctionArgs;
}

describe("resetPasswordLoader", () => {
  it("redirects to / when no token is present", () => {
    const result = resetPasswordLoader(makeArgs("http://localhost/reset-password"));

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Location")).toBe("/");
  });

  it("returns null when a token is present", () => {
    const result = resetPasswordLoader(makeArgs("http://localhost/reset-password?token=abc123"));

    expect(result).toBeNull();
  });
});
