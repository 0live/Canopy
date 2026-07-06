import { useUpdatePasswordForm } from "@/features/userProfile/hooks/dbAccess/useUpdatePasswordForm";
import { server } from "@/test/mocks/server";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { userProfileHandlers } from "../../mocks/handlers";

function useUpdatePasswordFormWithErrors() {
  const hook = useUpdatePasswordForm();
  void hook.form.formState.errors;
  return hook;
}

describe("useUpdatePasswordForm", () => {
  beforeEach(() => { server.use(...userProfileHandlers); });

  it("shows validation errors on empty submit without calling the API", async () => {
    const patchSpy = vi.fn();
    server.use(
      http.patch("/api/database-access/password", () => { patchSpy(); return HttpResponse.json({}); })
    );

    const { result } = renderHookWithProviders(() => useUpdatePasswordFormWithErrors());
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.password).toBeDefined()
    );
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it("calls PATCH /database-access/password with the password on valid submit", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch("/api/database-access/password", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ message: "Updated" });
      })
    );

    const { result } = renderHookWithProviders(() => useUpdatePasswordForm());
    act(() => {
      result.current.form.setValue("password", "validpassword123");
      result.current.form.setValue("confirmPassword", "validpassword123");
    });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => expect(capturedBody).toEqual({ password: "validpassword123" }));
  });

  it("shows success toast on valid submit", async () => {
    const { result } = renderHookWithProviders(() => useUpdatePasswordForm());
    act(() => {
      result.current.form.setValue("password", "validpassword123");
      result.current.form.setValue("confirmPassword", "validpassword123");
    });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("resets the form to empty values after successful submit", async () => {
    const { result } = renderHookWithProviders(() => useUpdatePasswordForm());
    act(() => {
      result.current.form.setValue("password", "validpassword123");
      result.current.form.setValue("confirmPassword", "validpassword123");
    });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() => {
      expect(result.current.form.getValues("password")).toBe("");
      expect(result.current.form.getValues("confirmPassword")).toBe("");
    });
  });

  it("sets root.serverError with the mapped db_access error key", async () => {
    server.use(
      http.patch("/api/database-access/password", () =>
        HttpResponse.json({ key: "db_access.password_update_failed" }, { status: 422 })
      )
    );

    const { result } = renderHookWithProviders(() => useUpdatePasswordFormWithErrors());
    act(() => {
      result.current.form.setValue("password", "validpassword123");
      result.current.form.setValue("confirmPassword", "validpassword123");
    });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.root?.serverError?.message).toBe(
        "dbAccess.errors.password_update_failed"
      )
    );
  });

  it("sets root.serverError with genericError on API 500", async () => {
    server.use(
      http.patch("/api/database-access/password", () => new HttpResponse(null, { status: 500 }))
    );

    const { result } = renderHookWithProviders(() => useUpdatePasswordFormWithErrors());
    act(() => {
      result.current.form.setValue("password", "validpassword123");
      result.current.form.setValue("confirmPassword", "validpassword123");
    });
    await act(async () => { await result.current.onSubmit(); });

    await waitFor(() =>
      expect(result.current.form.formState.errors.root?.serverError?.message).toBe("auth.genericError")
    );
  });
});
