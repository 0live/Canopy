import { setupRootUserLoader } from "@/features/setupRootUser/services/routes/setupRootUserLoader";
import type { LoaderFunctionArgs } from "react-router";

function makeArgs(url: string): LoaderFunctionArgs {
  return { request: new Request(url) } as unknown as LoaderFunctionArgs;
}

describe("setupRootUserLoader", () => {
  it("redirects to / when no token is present", () => {
    const result = setupRootUserLoader(makeArgs("http://localhost/setup"));

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Location")).toBe("/");
  });

  it("returns null when a token is present", () => {
    const result = setupRootUserLoader(makeArgs("http://localhost/setup?token=abc123"));

    expect(result).toBeNull();
  });
});
