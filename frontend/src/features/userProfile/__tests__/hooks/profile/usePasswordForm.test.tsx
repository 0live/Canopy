import { usePasswordForm } from "@/features/userProfile/hooks/profile/usePasswordForm";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { mockUser, userProfileHandlers } from "../../mocks/handlers";

function fillValidPassword(form: ReturnType<typeof usePasswordForm>["form"]) {
  form.setValue("currentPassword", "oldpassword123");
  form.setValue("password", "validpassword123");
  form.setValue("confirmPassword", "validpassword123");
}

function usePasswordFormWithErrors(user = mockUser) {
  const hook = usePasswordForm(user);
  void hook.form.formState.errors;
  return hook;
}

describe("usePasswordForm", () => {
  beforeEach(() => { server.use(...userProfileHandlers); });

  it("sends the new password in the payload", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch("/api/users/:userId", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(mockUser);
      })
    );

    const { result } = renderHookWithProviders(() => usePasswordForm(mockUser));
    act(() => { fillValidPassword(result.current.form); });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(capturedBody).toEqual({
        password: "validpassword123",
        current_password: "oldpassword123",
      })
    );
  });

  it("shows a validation error when currentPassword is missing", async () => {
    const { result } = renderHookWithProviders(() => usePasswordFormWithErrors());

    act(() => {
      result.current.form.setValue("password", "validpassword123");
      result.current.form.setValue("confirmPassword", "validpassword123");
    });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.currentPassword).toBeDefined()
    );
  });

  it("sets a currentPassword error on API 401", async () => {
    server.use(
      http.patch("/api/users/:userId", () => new HttpResponse(null, { status: 401 })),
      // The apiClient interceptor tries a silent refresh on any 401; make it fail
      // fast so the original wrong-current-password error surfaces to the form.
      http.post("/api/auth/refresh", () => new HttpResponse(null, { status: 401 }))
    );

    const { result } = renderHookWithProviders(() => usePasswordFormWithErrors());
    act(() => { fillValidPassword(result.current.form); });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.currentPassword?.message).toBe(
        "profile.currentPasswordInvalid"
      )
    );
  });

  it("resets the fields after a successful submit", async () => {
    const { result } = renderHookWithProviders(() => usePasswordForm(mockUser));
    act(() => { fillValidPassword(result.current.form); });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => expect(result.current.form.getValues("password")).toBe(""));
    expect(result.current.form.getValues("confirmPassword")).toBe("");
    expect(result.current.form.getValues("currentPassword")).toBe("");
  });

  it("shows a validation error when the password is too short", async () => {
    const { result } = renderHookWithProviders(() => usePasswordFormWithErrors());

    act(() => {
      result.current.form.setValue("password", "short");
      result.current.form.setValue("confirmPassword", "short");
    });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.password).toBeDefined()
    );
  });

  it("shows a validation error when passwords do not match", async () => {
    const { result } = renderHookWithProviders(() => usePasswordFormWithErrors());

    act(() => {
      result.current.form.setValue("password", "validpassword123");
      result.current.form.setValue("confirmPassword", "differentpassword456");
    });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.confirmPassword).toBeDefined()
    );
  });

  it("sets root.serverError on API 500", async () => {
    server.use(
      http.patch("/api/users/:userId", () => new HttpResponse(null, { status: 500 }))
    );

    const { result } = renderHookWithProviders(() => usePasswordFormWithErrors());
    act(() => { fillValidPassword(result.current.form); });
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

    const { result } = renderHookWithProviders(() => usePasswordForm(mockUser));
    act(() => { fillValidPassword(result.current.form); });
    act(() => { result.current.onSubmit(); });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    await act(async () => { resolveRequest(HttpResponse.json(mockUser)); });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
