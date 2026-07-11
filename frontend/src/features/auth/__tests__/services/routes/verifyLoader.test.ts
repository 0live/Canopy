import { queryClient } from "@/app/config/queryClient";
import { verifyLoader } from "@/features/auth/services/routes/verifyLoader";
import { useAppStore } from "@/shared/store";
import { server } from "@/test/mocks/server";
import { resetStore } from "@/test/utils/renderWithProviders";
import { http, HttpResponse } from "msw";
import type { LoaderFunctionArgs } from "react-router";
import { authHandlers, mockUser } from "../../mocks/handlers";

// Avoid TanStack Query's default retry delay slowing down the error-path tests
queryClient.setDefaultOptions({ queries: { retry: false } });

function makeArgs(url: string): LoaderFunctionArgs {
  return { request: new Request(url) } as unknown as LoaderFunctionArgs;
}

describe("verifyLoader", () => {
  beforeEach(() => { server.use(...authHandlers); });
  afterEach(() => {
    resetStore();
    queryClient.clear();
  });

  it("redirects to / when no token is present", async () => {
    const result = await verifyLoader(makeArgs("http://localhost/verify"));

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Location")).toBe("/");
  });

  it("sets the access token, current user, and success status on a valid token", async () => {
    const result = await verifyLoader(makeArgs("http://localhost/verify?token=valid-token"));

    expect(result).toBeNull();
    expect(useAppStore.getState().accessToken).toBe("test-access-token");
    expect(useAppStore.getState().verifyingStatus).toBe("success");
    expect(queryClient.getQueryData(["auth", "currentUser"])).toEqual(mockUser);
  });

  it("sets the error status when the token is rejected", async () => {
    server.use(http.get("/api/auth/verify", () => HttpResponse.json({}, { status: 400 })));

    const result = await verifyLoader(makeArgs("http://localhost/verify?token=expired-token"));

    expect(result).toBeNull();
    expect(useAppStore.getState().verifyingStatus).toBe("error");
    expect(useAppStore.getState().accessToken).toBeNull();
  });
});
