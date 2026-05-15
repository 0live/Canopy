import { useDeleteUser } from "@/features/admin/hooks/users/useDeleteUser";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { adminHandlers } from "../../mocks/handlers";

describe("useDeleteUser", () => {
  beforeEach(() => { server.use(...adminHandlers); });

  it("shows success toast and calls onSuccess on 204", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useDeleteUser(onSuccess));

    act(() => { result.current.mutate(1); });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("shows 'not found' toast and calls onSuccess on 404", async () => {
    server.use(
      http.delete("/api/users/:userId", () => new HttpResponse(null, { status: 404 }))
    );
    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useDeleteUser(onSuccess));

    act(() => { result.current.mutate(1); });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("shows generic error toast (interceptor) and does not call onSuccess on 500", async () => {
    server.use(
      http.delete("/api/users/:userId", () => new HttpResponse(null, { status: 500 }))
    );
    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useDeleteUser(onSuccess));

    act(() => { result.current.mutate(1); });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
