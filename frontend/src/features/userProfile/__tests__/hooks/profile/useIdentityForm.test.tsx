import { useIdentityForm } from "@/features/userProfile/hooks/profile/useIdentityForm";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { mockUser, userProfileHandlers } from "../../mocks/handlers";

function useIdentityFormWithErrors(user = mockUser) {
  const hook = useIdentityForm(user);
  void hook.form.formState.errors;
  return hook;
}

describe("useIdentityForm", () => {
  beforeEach(() => { server.use(...userProfileHandlers); });

  it("skips the API call when no field has changed", async () => {
    const patchSpy = vi.fn();
    server.use(
      http.patch("/api/users/:userId", () => { patchSpy(); return HttpResponse.json(mockUser); })
    );

    const { result } = renderHookWithProviders(() => useIdentityForm(mockUser));
    await act(async () => { await result.current.onSubmit(); });

    expect(patchSpy).not.toHaveBeenCalled();
  });

  it("sends only the changed email in the payload", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch("/api/users/:userId", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(mockUser);
      })
    );

    const { result } = renderHookWithProviders(() => useIdentityForm(mockUser));
    act(() => { result.current.form.setValue("email", "new@example.com"); });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => expect(capturedBody).toEqual({ email: "new@example.com" }));
  });

  it("sends only the changed username in the payload", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch("/api/users/:userId", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(mockUser);
      })
    );

    const { result } = renderHookWithProviders(() => useIdentityForm(mockUser));
    act(() => { result.current.form.setValue("username", "newusername"); });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => expect(capturedBody).toEqual({ username: "newusername" }));
  });

  it("shows a validation error when username is too short", async () => {
    const { result } = renderHookWithProviders(() => useIdentityFormWithErrors());

    act(() => { result.current.form.setValue("username", "ab"); });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.username).toBeDefined()
    );
  });

  it("sets field error on email when API returns email_exists", async () => {
    server.use(
      http.patch("/api/users/:userId", () =>
        HttpResponse.json({ key: "user.email_exists" }, { status: 409 })
      )
    );

    const { result } = renderHookWithProviders(() => useIdentityFormWithErrors());
    act(() => { result.current.form.setValue("email", "taken@example.com"); });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.email).toBeDefined()
    );
  });

  it("sets field error on username when API returns username_exists", async () => {
    server.use(
      http.patch("/api/users/:userId", () =>
        HttpResponse.json({ key: "user.username_exists" }, { status: 409 })
      )
    );

    const { result } = renderHookWithProviders(() => useIdentityFormWithErrors());
    act(() => { result.current.form.setValue("username", "takenuser"); });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.username).toBeDefined()
    );
  });

  it("sets root.serverError on API 500", async () => {
    server.use(
      http.patch("/api/users/:userId", () => new HttpResponse(null, { status: 500 }))
    );

    const { result } = renderHookWithProviders(() => useIdentityFormWithErrors());
    act(() => { result.current.form.setValue("email", "changed@example.com"); });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.root?.serverError?.message).toBe("auth.genericError")
    );
  });

  it("sets isPending true during request then false after", async () => {
    let resolveRequest!: (r: Response) => void;
    server.use(
      http.patch("/api/users/:userId", () => new Promise<Response>((res) => { resolveRequest = res; }))
    );

    const { result } = renderHookWithProviders(() => useIdentityForm(mockUser));
    act(() => { result.current.form.setValue("email", "pending@example.com"); });
    act(() => { result.current.onSubmit(); });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    await act(async () => { resolveRequest(HttpResponse.json(mockUser)); });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
