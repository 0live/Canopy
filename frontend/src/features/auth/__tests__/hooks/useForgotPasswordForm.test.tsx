import { useForgotPasswordForm } from "@/features/auth/hooks/useForgotPasswordForm";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { authHandlers } from "../mocks/handlers";

// Wrap hook to subscribe to formState.errors during render — required for react-hook-form to track error updates
function useForgotPasswordFormWithErrorTracking() {
  const hook = useForgotPasswordForm();
  void hook.form.formState.errors;
  return hook;
}

describe("useForgotPasswordForm", () => {
  beforeEach(() => { server.use(...authHandlers); });

  it("shows validation errors on empty submit without calling the API", async () => {
    const forgotPasswordSpy = vi.fn();
    server.use(http.post("/api/auth/forgot-password", () => {
      forgotPasswordSpy();
      return new HttpResponse(null, { status: 204 });
    }));

    const { result } = renderHookWithProviders(() => useForgotPasswordFormWithErrorTracking());

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => {
      expect(result.current.form.formState.errors.email).toBeDefined();
    });
    expect(forgotPasswordSpy).not.toHaveBeenCalled();
  });

  it("switches to success state after successful submit", async () => {
    const { result } = renderHookWithProviders(() => useForgotPasswordForm());

    act(() => { result.current.form.setValue("email", "alice@example.com"); });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("sets root.serverError on 500", async () => {
    server.use(http.post("/api/auth/forgot-password", () => HttpResponse.json({}, { status: 500 })));

    const { result } = renderHookWithProviders(() => useForgotPasswordFormWithErrorTracking());

    act(() => { result.current.form.setValue("email", "alice@example.com"); });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.root?.serverError?.message).toBe("auth.genericError")
    );
  });

  it("sets isPending true during request then false after", async () => {
    let resolveRequest!: (r: Response) => void;
    server.use(http.post("/api/auth/forgot-password", () => new Promise<Response>((res) => { resolveRequest = res; })));

    const { result } = renderHookWithProviders(() => useForgotPasswordForm());

    act(() => { result.current.form.setValue("email", "alice@example.com"); });

    act(() => { result.current.onSubmit(); });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    await act(async () => { resolveRequest(new HttpResponse(null, { status: 204 })); });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
