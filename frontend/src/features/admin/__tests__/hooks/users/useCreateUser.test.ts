import { useCreateUser } from "@/features/admin/hooks/users/useCreateUser";
import { UserRole } from "@/shared/types/UserRole";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { adminHandlers } from "../../mocks/handlers";

const payload = {
  email: "newuser@example.com",
  username: "newuser",
  password: "supersecret1234",
  roles: [UserRole.USER],
};

describe("useCreateUser", () => {
  beforeEach(() => { server.use(...adminHandlers); });

  it("shows success toast and calls onSuccess on 200", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useCreateUser(onSuccess));

    act(() => {
      result.current.mutate(payload);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("shows generic error toast (interceptor) and does not call onSuccess on API error", async () => {
    server.use(
      http.post("/api/users", () => new HttpResponse(null, { status: 500 }))
    );
    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useCreateUser(onSuccess));

    act(() => {
      result.current.mutate(payload);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
