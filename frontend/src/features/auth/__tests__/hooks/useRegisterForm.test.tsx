import { useRegisterForm } from "@/features/auth/hooks/useRegisterForm";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { authHandlers } from "../mocks/handlers";

const validData = {
  email: "alice@example.com",
  username: "alice123",
  password: "supersecret1234",
  altcha_payload: "captcha-token",
};

// Wrap hook to subscribe to formState.errors during render — required for react-hook-form to track error updates
function useRegisterFormWithErrorTracking(onSuccess?: () => void) {
  const hook = useRegisterForm(onSuccess);
  void hook.form.formState.errors;
  return hook;
}

function fillValidForm(result: { current: ReturnType<typeof useRegisterForm> }) {
  result.current.form.setValue("email", validData.email);
  result.current.form.setValue("username", validData.username);
  result.current.form.setValue("password", validData.password);
  result.current.form.setValue("altcha_payload", validData.altcha_payload);
}

describe("useRegisterForm", () => {
  beforeEach(() => { server.use(...authHandlers); });

  it("shows validation errors on empty submit without calling the API", async () => {
    const registerSpy = vi.fn();
    server.use(http.post("/api/auth/register", () => { registerSpy(); return HttpResponse.json({}, { status: 201 }); }));

    const { result } = renderHookWithProviders(() => useRegisterFormWithErrorTracking());

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => {
      expect(result.current.form.formState.errors.email).toBeDefined();
      expect(result.current.form.formState.errors.username).toBeDefined();
      expect(result.current.form.formState.errors.password).toBeDefined();
    });
    expect(registerSpy).not.toHaveBeenCalled();
  });

  it("sets isSuccess and shows toast on successful register", async () => {
    const { result } = renderHookWithProviders(() => useRegisterForm());

    act(() => { fillValidForm(result); });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(toast.info).toHaveBeenCalled();
    });
  });

  it("sets email field error on email_exists response", async () => {
    server.use(
      http.post("/api/auth/register", () => HttpResponse.json({ key: "user.email_exists" }, { status: 409 }))
    );

    const { result } = renderHookWithProviders(() => useRegisterFormWithErrorTracking());

    act(() => { fillValidForm(result); });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.email?.message).toBe("user.email_exists")
    );
  });

  it("sets username field error on username_exists response", async () => {
    server.use(
      http.post("/api/auth/register", () => HttpResponse.json({ key: "user.username_exists" }, { status: 409 }))
    );

    const { result } = renderHookWithProviders(() => useRegisterFormWithErrorTracking());

    act(() => { fillValidForm(result); });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.username?.message).toBe("user.username_exists")
    );
  });

  it("sets root.serverError on generic API error", async () => {
    server.use(http.post("/api/auth/register", () => HttpResponse.json({}, { status: 500 })));

    const { result } = renderHookWithProviders(() => useRegisterFormWithErrorTracking());

    act(() => { fillValidForm(result); });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.root?.serverError?.message).toBe("auth.genericError")
    );
  });
});
