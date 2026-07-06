import { useDbAccessStatus } from "@/features/userProfile/hooks/dbAccess/useDbAccessStatus";
import { useAppStore } from "@/shared/store";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { mockDbStatusActive, mockDbStatusInactive, userProfileHandlers } from "../../mocks/handlers";

describe("useDbAccessStatus", () => {
  beforeEach(() => { server.use(...userProfileHandlers); });

  it("does not fetch when there is no accessToken", async () => {
    const fetchSpy = vi.fn();
    server.use(
      http.get("/api/database-access/status", () => {
        fetchSpy();
        return HttpResponse.json(mockDbStatusInactive);
      })
    );

    const { result } = renderHookWithProviders(() => useDbAccessStatus());
    await act(async () => {});

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it("returns inactive status when DB access is not activated", async () => {
    useAppStore.setState({ accessToken: "test-token" });

    const { result } = renderHookWithProviders(() => useDbAccessStatus());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(mockDbStatusInactive);
    expect(result.current.data?.is_activated).toBe(false);
  });

  it("returns active status with role_name when DB access is activated", async () => {
    useAppStore.setState({ accessToken: "test-token" });
    server.use(
      http.get("/api/database-access/status", () =>
        HttpResponse.json(mockDbStatusActive)
      )
    );

    const { result } = renderHookWithProviders(() => useDbAccessStatus());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.is_activated).toBe(true);
    expect(result.current.data?.role_name).toBe("user_1");
  });
});
