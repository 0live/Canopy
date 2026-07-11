import { useNotificationWebSocket } from "@/features/userProfile/hooks/notifications/useNotificationWebSocket";
import { NotificationKey, NotificationType, type NotificationWsMessage } from "@/features/userProfile/types";
import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { useAppStore } from "@/shared/store";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { toast } from "sonner";

// jsdom does not implement WebSocket, so tests install a minimal fake and
// drive its lifecycle callbacks (onopen/onmessage/onclose) manually.
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  url: string;
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  triggerMessage(data: NotificationWsMessage) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  triggerClose() {
    this.onclose?.();
  }
}

function lastSocket(): FakeWebSocket {
  return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
}

describe("useNotificationWebSocket", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    useAppStore.setState({ unreadCount: 0 });
  });

  it("does not open a connection when there is no access token", () => {
    renderHookWithProviders(() => useNotificationWebSocket());

    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("opens a connection carrying the access token", () => {
    useAppStore.setState({ accessToken: "token-123" });

    renderHookWithProviders(() => useNotificationWebSocket());

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(lastSocket().url).toContain("token=token-123");
  });

  it("increments unreadCount and shows a toast on an incoming message", async () => {
    useAppStore.setState({ accessToken: "token-123" });
    renderHookWithProviders(() => useNotificationWebSocket());

    act(() => {
      lastSocket().triggerMessage({
        type: NotificationType.INFO,
        key: null,
        payload: null,
        timestamp: "2024-01-01T00:00:00Z",
      });
    });

    await waitFor(() => expect(useAppStore.getState().unreadCount).toBe(1));
    expect(toast.info).toHaveBeenCalled();
  });

  it("invalidates the current user query when a ROLES_CHANGED message arrives", async () => {
    useAppStore.setState({ accessToken: "token-123" });
    const { queryClient } = renderHookWithProviders(() => useNotificationWebSocket());
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    act(() => {
      lastSocket().triggerMessage({
        type: NotificationType.INFO,
        key: NotificationKey.ROLES_CHANGED,
        payload: null,
        timestamp: "2024-01-01T00:00:00Z",
      });
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.AUTH.CURRENT_USER() })
    );
  });

  it("reconnects with an exponential backoff after the socket closes", () => {
    vi.useFakeTimers();
    useAppStore.setState({ accessToken: "token-123" });
    renderHookWithProviders(() => useNotificationWebSocket());

    act(() => { lastSocket().triggerClose(); });
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => { vi.advanceTimersByTime(999); });
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => { vi.advanceTimersByTime(1); });
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("clears the pending reconnect timer on unmount", () => {
    vi.useFakeTimers();
    useAppStore.setState({ accessToken: "token-123" });
    const { unmount } = renderHookWithProviders(() => useNotificationWebSocket());

    act(() => { lastSocket().triggerClose(); });
    unmount();

    act(() => { vi.advanceTimersByTime(30_000); });

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("closes the socket on unmount", () => {
    useAppStore.setState({ accessToken: "token-123" });
    const { unmount } = renderHookWithProviders(() => useNotificationWebSocket());
    const socket = lastSocket();

    unmount();

    expect(socket.closed).toBe(true);
  });
});
