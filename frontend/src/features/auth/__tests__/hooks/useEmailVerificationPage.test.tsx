import { useEmailVerificationPage } from "@/features/auth/hooks/useEmailVerificationPage";
import { useAppStore } from "@/shared/store";
import { renderHookWithProviders } from "@/test/utils/renderWithProviders";
import { waitFor } from "@testing-library/react";
import { toast } from "sonner";

const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

describe("useEmailVerificationPage", () => {
  it("returns isError false when verifyingStatus is null", () => {
    const { result } = renderHookWithProviders(() => useEmailVerificationPage());

    expect(result.current.isError).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("returns isError true when verifyingStatus is error", () => {
    useAppStore.setState({ verifyingStatus: "error" });

    const { result } = renderHookWithProviders(() => useEmailVerificationPage());

    expect(result.current.isError).toBe(true);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("toasts success and navigates home when verifyingStatus is success", async () => {
    useAppStore.setState({ verifyingStatus: "success" });

    renderHookWithProviders(() => useEmailVerificationPage());

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(toast.success).toHaveBeenCalledWith("auth.verificationSuccess", expect.anything());
  });

  it("resets verifyingStatus to null on unmount after a success", async () => {
    useAppStore.setState({ verifyingStatus: "success" });

    const { unmount } = renderHookWithProviders(() => useEmailVerificationPage());

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());

    unmount();

    expect(useAppStore.getState().verifyingStatus).toBeNull();
  });
});
