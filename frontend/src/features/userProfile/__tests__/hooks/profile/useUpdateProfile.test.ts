import { queryClient } from "@/app/config/queryClient";
import { useUpdateProfile } from "@/features/userProfile/hooks/profile/useUpdateProfile";
import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { mockUser, userProfileHandlers } from "../../mocks/handlers";

// useUpdateProfile invalidates the app-wide queryClient singleton (not the
// per-test QueryClient from renderHookWithProviders), so assertions read that
// singleton directly.
describe("useUpdateProfile", () => {
  beforeEach(() => { server.use(...userProfileHandlers); });
  afterEach(() => { queryClient.clear(); });

  it("calls PATCH /users/:userId with the given payload", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch("/api/users/:userId", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(mockUser);
      })
    );

    const { result } = renderHookWithProviders(() => useUpdateProfile());
    act(() => {
      result.current.mutate({ userId: mockUser.id, payload: { username: "newname" } });
    });

    await waitFor(() => expect(capturedBody).toEqual({ username: "newname" }));
  });

  it("invalidates the current user query and shows a success toast", async () => {
    queryClient.setQueryData(QUERY_KEYS.AUTH.CURRENT_USER(), mockUser);

    const { result } = renderHookWithProviders(() => useUpdateProfile());
    act(() => {
      result.current.mutate({ userId: mockUser.id, payload: { username: "newname" } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryState(QUERY_KEYS.AUTH.CURRENT_USER())?.isInvalidated).toBe(true);
    expect(toast.success).toHaveBeenCalled();
  });

  it("sets isError and does not show a success toast on API 500", async () => {
    server.use(http.patch("/api/users/:userId", () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHookWithProviders(() => useUpdateProfile());
    act(() => {
      result.current.mutate({ userId: mockUser.id, payload: { username: "newname" } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.success).not.toHaveBeenCalled();
  });
});
