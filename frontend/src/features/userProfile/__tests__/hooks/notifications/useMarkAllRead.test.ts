import { useMarkAllRead } from "@/features/userProfile/hooks/notifications/useMarkAllRead";
import { useAppStore } from "@/shared/store";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { userProfileHandlers } from "../../mocks/handlers";

describe("useMarkAllRead", () => {
  beforeEach(() => { server.use(...userProfileHandlers); });
  afterEach(() => { useAppStore.setState({ unreadCount: 0 }); });

  it("calls PATCH /notifications/read-all", async () => {
    const patchSpy = vi.fn();
    server.use(
      http.patch("/api/notifications/read-all", () => { patchSpy(); return HttpResponse.json({}); })
    );

    const { result } = renderHookWithProviders(() => useMarkAllRead());
    act(() => { result.current.mutate(); });

    await waitFor(() => expect(patchSpy).toHaveBeenCalled());
  });

  it("resets unreadCount to 0 in the store on success", async () => {
    useAppStore.setState({ unreadCount: 5 });

    const { result } = renderHookWithProviders(() => useMarkAllRead());
    act(() => { result.current.mutate(); });

    await waitFor(() => expect(useAppStore.getState().unreadCount).toBe(0));
  });

  it("does not change unreadCount on API 500", async () => {
    useAppStore.setState({ unreadCount: 3 });
    server.use(
      http.patch("/api/notifications/read-all", () => new HttpResponse(null, { status: 500 }))
    );

    const { result } = renderHookWithProviders(() => useMarkAllRead());
    act(() => { result.current.mutate(); });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(useAppStore.getState().unreadCount).toBe(3);
  });
});
