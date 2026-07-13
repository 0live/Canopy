import { useSetupRootUserForm } from "@/features/setupRootUser/hooks/useSetupRootUserForm";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { setupRootUserHandlers } from "../mocks/handlers";

const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams("token=setup-token-123");

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
  };
});

function useSetupRootUserFormWithErrorTracking() {
  const hook = useSetupRootUserForm();
  void hook.form.formState.errors;
  return hook;
}

function fillValidValues(result: ReturnType<typeof useSetupRootUserFormWithErrorTracking>) {
  result.form.setValue("email", "admin@canopy.dev");
  result.form.setValue("username", "admin");
  result.form.setValue("password", "supersecret1234");
}

describe("useSetupRootUserForm", () => {
  beforeEach(() => { server.use(...setupRootUserHandlers); });

  it("shows validation errors on empty submit without calling the API", async () => {
    const setupSpy = vi.fn();
    server.use(http.post("/api/setup/complete", () => {
      setupSpy();
      return HttpResponse.json({}, { status: 200 });
    }));

    const { result } = renderHookWithProviders(() => useSetupRootUserFormWithErrorTracking());

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => {
      expect(result.current.form.formState.errors.email).toBeDefined();
      expect(result.current.form.formState.errors.username).toBeDefined();
      expect(result.current.form.formState.errors.password).toBeDefined();
    });
    expect(setupSpy).not.toHaveBeenCalled();
  });

  it("toasts success and navigates home after a valid submit", async () => {
    const { result } = renderHookWithProviders(() => useSetupRootUserForm());

    act(() => { fillValidValues(result.current); });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(toast.success).toHaveBeenCalledWith("setupRootUser.success", expect.anything());
  });

  it("sets root.serverError to setupRootUser.tokenInvalid when the token is rejected", async () => {
    server.use(
      http.post("/api/setup/complete", () =>
        HttpResponse.json({ key: "setup_root_user.token_invalid" }, { status: 401 })
      )
    );

    const { result } = renderHookWithProviders(() => useSetupRootUserFormWithErrorTracking());

    act(() => { fillValidValues(result.current); });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.root?.serverError?.message).toBe("setupRootUser.tokenInvalid")
    );
  });

  it("sets root.serverError to setupRootUser.alreadyCompleted when an admin already exists", async () => {
    server.use(
      http.post("/api/setup/complete", () =>
        HttpResponse.json({ key: "setup_root_user.already_completed" }, { status: 403 })
      )
    );

    const { result } = renderHookWithProviders(() => useSetupRootUserFormWithErrorTracking());

    act(() => { fillValidValues(result.current); });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.root?.serverError?.message).toBe("setupRootUser.alreadyCompleted")
    );
  });

  it("sets root.serverError to genericError on an unrelated 500", async () => {
    server.use(http.post("/api/setup/complete", () => HttpResponse.json({}, { status: 500 })));

    const { result } = renderHookWithProviders(() => useSetupRootUserFormWithErrorTracking());

    act(() => { fillValidValues(result.current); });

    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.root?.serverError?.message).toBe("auth.genericError")
    );
  });
});
