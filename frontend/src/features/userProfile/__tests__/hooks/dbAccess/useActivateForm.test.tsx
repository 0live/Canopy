import { useActivateForm } from "@/features/userProfile/hooks/dbAccess/useActivateForm";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { userProfileHandlers } from "../../mocks/handlers";

function useActivateFormWithErrors() {
  const hook = useActivateForm();
  void hook.form.formState.errors;
  return hook;
}

describe("useActivateForm", () => {
  beforeEach(() => { server.use(...userProfileHandlers); });

  it("shows validation errors on empty submit without calling the API", async () => {
    const postSpy = vi.fn();
    server.use(
      http.post("/api/database-access/activate", () => { postSpy(); return HttpResponse.json({}); })
    );

    const { result } = renderHookWithProviders(() => useActivateFormWithErrors());
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.password).toBeDefined()
    );
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("calls POST /database-access/activate with the password on valid submit", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("/api/database-access/activate", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ role_name: "user_1", message: "Activated" }, { status: 201 });
      })
    );

    const { result } = renderHookWithProviders(() => useActivateForm());
    act(() => {
      result.current.form.setValue("password", "validpassword123");
      result.current.form.setValue("confirmPassword", "validpassword123");
    });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => expect(capturedBody).toEqual({ password: "validpassword123" }));
    expect(toast.success).toHaveBeenCalled();
  });

  it("sets root.serverError with the mapped db_access error key", async () => {
    server.use(
      http.post("/api/database-access/activate", () =>
        HttpResponse.json({ key: "db_access.activation_failed" }, { status: 422 })
      )
    );

    const { result } = renderHookWithProviders(() => useActivateFormWithErrors());
    act(() => {
      result.current.form.setValue("password", "validpassword123");
      result.current.form.setValue("confirmPassword", "validpassword123");
    });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.root?.serverError?.message).toBe(
        "dbAccess.errors.activation_failed"
      )
    );
  });

  it("sets root.serverError with genericError on API 500", async () => {
    server.use(
      http.post("/api/database-access/activate", () => new HttpResponse(null, { status: 500 }))
    );

    const { result } = renderHookWithProviders(() => useActivateFormWithErrors());
    act(() => {
      result.current.form.setValue("password", "validpassword123");
      result.current.form.setValue("confirmPassword", "validpassword123");
    });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.root?.serverError?.message).toBe("auth.genericError")
    );
  });

  it("sets isPending true during request then false after", async () => {
    let resolveRequest!: (r: Response) => void;
    server.use(
      http.post("/api/database-access/activate", () =>
        new Promise<Response>((res) => { resolveRequest = res; })
      )
    );

    const { result } = renderHookWithProviders(() => useActivateForm());
    act(() => {
      result.current.form.setValue("password", "validpassword123");
      result.current.form.setValue("confirmPassword", "validpassword123");
    });
    act(() => { result.current.onSubmit(); });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    await act(async () => {
      resolveRequest(HttpResponse.json({ role_name: "user_1", message: "ok" }, { status: 201 }));
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
