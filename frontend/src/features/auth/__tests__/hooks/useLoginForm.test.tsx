import { useLoginForm } from "@/features/auth/hooks/useLoginForm";
import { mockTokens } from "@/test/mocks/handlers";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

// Wrap hook to subscribe to formState.errors during render — required for react-hook-form to track error updates
function useLoginFormWithErrorTracking(onSuccess?: () => void) {
  const hook = useLoginForm(onSuccess);
  void hook.form.formState.errors;
  return hook;
}

describe("useLoginForm", () => {
  it("shows validation errors on empty submit without calling the API", async () => {
    const loginSpy = vi.fn();
    server.use(http.post("/api/auth/login", () => { loginSpy(); return HttpResponse.json(mockTokens); }));

    const { result } = renderHookWithProviders(() => useLoginFormWithErrorTracking());

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => {
      expect(result.current.form.formState.errors.username).toBeDefined();
      expect(result.current.form.formState.errors.password).toBeDefined();
    });
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it("calls onSuccess after successful login", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useLoginForm(onSuccess));

    act(() => {
      result.current.form.setValue("username", "alice");
      result.current.form.setValue("password", "secret");
    });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("sets root.serverError on 401", async () => {
    server.use(http.post("/api/auth/login", () => HttpResponse.json({}, { status: 401 })));

    const { result } = renderHookWithProviders(() => useLoginFormWithErrorTracking());

    act(() => {
      result.current.form.setValue("username", "alice");
      result.current.form.setValue("password", "wrong");
    });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.root?.serverError?.message).toBe("auth.loginError")
    );
  });

  it("sets root.serverError on 500", async () => {
    server.use(http.post("/api/auth/login", () => HttpResponse.json({}, { status: 500 })));

    const { result } = renderHookWithProviders(() => useLoginFormWithErrorTracking());

    act(() => {
      result.current.form.setValue("username", "alice");
      result.current.form.setValue("password", "secret");
    });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.root?.serverError?.message).toBe("auth.genericError")
    );
  });

  it("sets isPending true during request then false after", async () => {
    let resolveLogin!: (r: Response) => void;
    server.use(http.post("/api/auth/login", () => new Promise<Response>((res) => { resolveLogin = res; })));

    const { result } = renderHookWithProviders(() => useLoginForm());

    act(() => {
      result.current.form.setValue("username", "alice");
      result.current.form.setValue("password", "secret");
    });

    act(() => { result.current.onSubmit(); });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    await act(async () => { resolveLogin(HttpResponse.json(mockTokens)); });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
