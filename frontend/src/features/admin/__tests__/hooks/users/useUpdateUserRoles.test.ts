import { useUpdateUserRoles } from "@/features/admin/hooks/users/useUpdateUserRoles";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { UserRole } from "@/shared/types/UserRole";
import { adminHandlers } from "../../mocks/handlers";

describe("useUpdateUserRoles", () => {
  beforeEach(() => { server.use(...adminHandlers); });

  it("shows success toast and calls onSuccess on 200", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useUpdateUserRoles(onSuccess));

    act(() => {
      result.current.mutate({ userId: 2, roles: [UserRole.USER, UserRole.ADMIN] });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("shows generic error toast (interceptor) and does not call onSuccess on API error", async () => {
    server.use(
      http.put("/api/users/:userId/roles", () => new HttpResponse(null, { status: 500 }))
    );
    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useUpdateUserRoles(onSuccess));

    act(() => {
      result.current.mutate({ userId: 2, roles: [UserRole.ADMIN] });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
