import { useNotifications } from "@/features/userProfile/hooks/notifications/useNotifications";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { mockNotification, userProfileHandlers } from "../../mocks/handlers";

describe("useNotifications", () => {
  beforeEach(() => { server.use(...userProfileHandlers); });

  it("starts with isLoading true", () => {
    const { result } = renderHookWithProviders(() => useNotifications());
    expect(result.current.isLoading).toBe(true);
  });

  it("returns notifications and total after loading", async () => {
    const { result } = renderHookWithProviders(() => useNotifications());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notifications).toEqual([mockNotification]);
    expect(result.current.total).toBe(1);
  });

  it("starts on page 0 with pageSize 25", async () => {
    const { result } = renderHookWithProviders(() => useNotifications());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.page).toBe(0);
    expect(result.current.pageSize).toBe(25);
  });

  it("sends skip=25 when page changes to 1", async () => {
    let capturedSkip: string | null = null;
    server.use(
      http.get("/api/notifications", ({ request }) => {
        capturedSkip = new URL(request.url).searchParams.get("skip");
        return HttpResponse.json({ items: [], total: 0 });
      })
    );

    const { result } = renderHookWithProviders(() => useNotifications());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.setPage(1); });

    await waitFor(() => expect(capturedSkip).toBe("25"));
    expect(result.current.page).toBe(1);
  });

  it("sets isError and returns empty defaults on API 500", async () => {
    server.use(
      http.get("/api/notifications", () => new HttpResponse(null, { status: 500 }))
    );

    const { result } = renderHookWithProviders(() => useNotifications());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.notifications).toEqual([]);
    expect(result.current.total).toBe(0);
  });
});
