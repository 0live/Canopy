import { useDeleteNotifications } from "@/features/userProfile/hooks/notifications/useDeleteNotifications";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { userProfileHandlers } from "../../mocks/handlers";

describe("useDeleteNotifications", () => {
  beforeEach(() => { server.use(...userProfileHandlers); });

  it("calls POST /notifications/bulk-delete with the given ids", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("/api/notifications/bulk-delete", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ deleted: 2 });
      })
    );

    const { result } = renderHookWithProviders(() => useDeleteNotifications());
    act(() => { result.current.mutate([1, 2]); });

    await waitFor(() =>
      expect(capturedBody).toEqual({ notification_ids: [1, 2] })
    );
  });

  it("shows success toast and calls onSuccess callback on 200", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useDeleteNotifications(onSuccess));

    act(() => { result.current.mutate([1]); });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("sets isError and does not call onSuccess on API 500", async () => {
    server.use(
      http.post("/api/notifications/bulk-delete", () => new HttpResponse(null, { status: 500 }))
    );

    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useDeleteNotifications(onSuccess));

    act(() => { result.current.mutate([1]); });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
