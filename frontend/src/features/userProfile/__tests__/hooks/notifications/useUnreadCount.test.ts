import { useUnreadCount } from "@/features/userProfile/hooks/notifications/useUnreadCount";
import { useAppStore } from "@/shared/store";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { userProfileHandlers } from "../../mocks/handlers";

describe("useUnreadCount", () => {
  beforeEach(() => { server.use(...userProfileHandlers); });
  afterEach(() => { useAppStore.setState({ unreadCount: 0 }); });

  it("does not fetch when there is no accessToken", async () => {
    const fetchSpy = vi.fn();
    server.use(
      http.get("/api/notifications", ({ request }) => {
        if (new URL(request.url).searchParams.get("unread_only") === "true") {
          fetchSpy();
          return HttpResponse.json({ items: [], total: 0 });
        }
        return HttpResponse.json({ items: [], total: 0 });
      })
    );

    renderHookWithProviders(() => useUnreadCount());
    await act(async () => {});

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(useAppStore.getState().unreadCount).toBe(0);
  });

  it("syncs unreadCount to the store when 1 unread notification is returned", async () => {
    useAppStore.setState({ accessToken: "test-token" });

    renderHookWithProviders(() => useUnreadCount());

    await waitFor(() => expect(useAppStore.getState().unreadCount).toBe(1));
  });

  it("sets unreadCount to 0 when no unread notifications are returned", async () => {
    useAppStore.setState({ accessToken: "test-token", unreadCount: 5 });
    server.use(
      http.get("/api/notifications", ({ request }) => {
        if (new URL(request.url).searchParams.get("unread_only") === "true") {
          return HttpResponse.json({ items: [], total: 0 });
        }
        return HttpResponse.json({ items: [], total: 0 });
      })
    );

    renderHookWithProviders(() => useUnreadCount());

    await waitFor(() => expect(useAppStore.getState().unreadCount).toBe(0));
  });
});
