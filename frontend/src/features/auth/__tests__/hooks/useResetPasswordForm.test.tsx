import { useResetPasswordForm } from "@/features/auth/hooks/useResetPasswordForm";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { authHandlers } from "../mocks/handlers";

const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams("token=reset-token-123");

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
  };
});

// Wrap hook to subscribe to formState.errors during render — required for react-hook-form to track error updates
function useResetPasswordFormWithErrorTracking() {
  const hook = useResetPasswordForm();
  void hook.form.formState.errors;
  return hook;
}

describe("useResetPasswordForm", () => {
  beforeEach(() => { server.use(...authHandlers); });

  it("shows validation errors on empty submit without calling the API", async () => {
    const resetSpy = vi.fn();
    server.use(http.post("/api/auth/reset-password", () => {
      resetSpy();
      return new HttpResponse(null, { status: 204 });
    }));

    const { result } = renderHookWithProviders(() => useResetPasswordFormWithErrorTracking());

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => {
      expect(result.current.form.formState.errors.new_password).toBeDefined();
      expect(result.current.form.formState.errors.confirm_password).toBeDefined();
    });
    expect(resetSpy).not.toHaveBeenCalled();
  });

  it("shows a mismatch error when passwords differ", async () => {
    const { result } = renderHookWithProviders(() => useResetPasswordFormWithErrorTracking());

    act(() => {
      result.current.form.setValue("new_password", "supersecret1234");
      result.current.form.setValue("confirm_password", "differentpassword");
    });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.confirm_password).toBeDefined()
    );
  });

  it("toasts success and navigates home after a valid submit", async () => {
    const { result } = renderHookWithProviders(() => useResetPasswordForm());

    act(() => {
      result.current.form.setValue("new_password", "supersecret1234");
      result.current.form.setValue("confirm_password", "supersecret1234");
    });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(toast.success).toHaveBeenCalledWith("auth.resetPasswordSuccess", expect.anything());
  });

  it("sets root.serverError to resetTokenInvalid when the token is rejected", async () => {
    server.use(
      http.post("/api/auth/reset-password", () =>
        HttpResponse.json({ key: "auth.reset_token_invalid" }, { status: 400 })
      )
    );

    const { result } = renderHookWithProviders(() => useResetPasswordFormWithErrorTracking());

    act(() => {
      result.current.form.setValue("new_password", "supersecret1234");
      result.current.form.setValue("confirm_password", "supersecret1234");
    });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.root?.serverError?.message).toBe("auth.resetTokenInvalid")
    );
  });

  it("sets root.serverError to genericError on an unrelated 500", async () => {
    server.use(http.post("/api/auth/reset-password", () => HttpResponse.json({}, { status: 500 })));

    const { result } = renderHookWithProviders(() => useResetPasswordFormWithErrorTracking());

    act(() => {
      result.current.form.setValue("new_password", "supersecret1234");
      result.current.form.setValue("confirm_password", "supersecret1234");
    });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.root?.serverError?.message).toBe("auth.genericError")
    );
  });

  it("sets isPending true during request then false after", async () => {
    let resolveRequest!: (r: Response) => void;
    server.use(http.post("/api/auth/reset-password", () => new Promise<Response>((res) => { resolveRequest = res; })));

    const { result } = renderHookWithProviders(() => useResetPasswordForm());

    act(() => {
      result.current.form.setValue("new_password", "supersecret1234");
      result.current.form.setValue("confirm_password", "supersecret1234");
    });

    act(() => { result.current.onSubmit(); });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    await act(async () => { resolveRequest(new HttpResponse(null, { status: 204 })); });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
