import { queryClient } from "@/app/config/queryClient";
import { authLoader } from "@/features/auth/services/routes/authLoader";
import { STORAGE_KEYS } from "@/shared/constants/storageKeys";
import { useAppStore } from "@/shared/store";
import { server } from "@/test/mocks/server";
import { resetStore } from "@/test/utils/renderWithProviders";
import { http, HttpResponse } from "msw";
import { authHandlers, mockUser } from "../../mocks/handlers";

// Avoid TanStack Query's default retry delay slowing down the error-path test
queryClient.setDefaultOptions({ queries: { retry: false } });

describe("authLoader", () => {
  beforeEach(() => { server.use(...authHandlers); });
  afterEach(() => {
    resetStore();
    queryClient.clear();
  });

  it("returns null without calling the API when no session flag is stored", async () => {
    const refreshSpy = vi.fn();
    server.use(http.post("/api/auth/refresh", () => {
      refreshSpy();
      return HttpResponse.json({}, { status: 200 });
    }));

    const result = await authLoader();

    expect(result).toBeNull();
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(useAppStore.getState().isLoading).toBe(false);
  });

  it("refreshes the token and loads the current user when a session flag is stored", async () => {
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, "true");

    const result = await authLoader();

    expect(result).toBeNull();
    expect(useAppStore.getState().accessToken).toBe("test-access-token");
    expect(useAppStore.getState().isLoading).toBe(false);
    expect(queryClient.getQueryData(["auth", "currentUser"])).toEqual(mockUser);
  });

  it("clears auth when the refresh token is rejected", async () => {
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, "true");
    server.use(http.post("/api/auth/refresh", () => HttpResponse.json({}, { status: 401 })));

    const result = await authLoader();

    expect(result).toBeNull();
    expect(useAppStore.getState().accessToken).toBeNull();
    expect(useAppStore.getState().isLoading).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.AUTH_SESSION)).toBeNull();
  });
});
