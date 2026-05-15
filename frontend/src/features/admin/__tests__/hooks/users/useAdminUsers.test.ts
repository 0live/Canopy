import { useAdminUsers } from "@/features/admin/hooks/users/useAdminUsers";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { adminHandlers, mockPaginatedUsers } from "../../mocks/handlers";

describe("useAdminUsers", () => {
  beforeEach(() => { server.use(...adminHandlers); });

  it("returns users and total after loading", async () => {
    const { result } = renderHookWithProviders(() => useAdminUsers());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toEqual(mockPaginatedUsers.items);
    expect(result.current.total).toBe(mockPaginatedUsers.total);
  });

  it("starts on page 0 with pageSize 25", async () => {
    const { result } = renderHookWithProviders(() => useAdminUsers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.page).toBe(0);
    expect(result.current.pageSize).toBe(25);
  });

  it("sends skip=25 when page changes to 1", async () => {
    let capturedSkip: string | null = null;
    server.use(
      http.get("/api/users", ({ request }) => {
        capturedSkip = new URL(request.url).searchParams.get("skip");
        return HttpResponse.json(mockPaginatedUsers);
      })
    );

    const { result } = renderHookWithProviders(() => useAdminUsers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.setPage(1); });

    await waitFor(() => expect(capturedSkip).toBe("25"));
    expect(result.current.page).toBe(1);
  });

  it("sets isError and returns empty data on API 500", async () => {
    server.use(
      http.get("/api/users", () => new HttpResponse(null, { status: 500 }))
    );

    const { result } = renderHookWithProviders(() => useAdminUsers());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.users).toEqual([]);
    expect(result.current.total).toBe(0);
  });
});
