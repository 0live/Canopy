import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

async function fillValidPasswords(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("auth.newPassword"), "supersecret1234");
  await user.type(screen.getByLabelText("auth.confirmPassword"), "supersecret1234");
}

describe("ResetPasswordForm", () => {
  beforeEach(() => { server.use(...authHandlers); });

  it("renders password fields and submit button", () => {
    renderWithProviders(<ResetPasswordForm />);
    expect(screen.getByLabelText("auth.newPassword")).toBeInTheDocument();
    expect(screen.getByLabelText("auth.confirmPassword")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "auth.resetPasswordSubmit" })).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm />);

    await user.click(screen.getByRole("button", { name: "auth.resetPasswordSubmit" }));

    await waitFor(() => expect(screen.getAllByText("auth.requiredPassword").length).toBeGreaterThan(0));
  });

  it("shows a mismatch error when passwords differ", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("auth.newPassword"), "supersecret1234");
    await user.type(screen.getByLabelText("auth.confirmPassword"), "differentpassword");
    await user.click(screen.getByRole("button", { name: "auth.resetPasswordSubmit" }));

    await waitFor(() => expect(screen.getByText("auth.passwordMismatch")).toBeInTheDocument());
  });

  it("toasts success and navigates home after a valid submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm />);

    await fillValidPasswords(user);
    await user.click(screen.getByRole("button", { name: "auth.resetPasswordSubmit" }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(toast.success).toHaveBeenCalledWith("auth.resetPasswordSuccess", expect.anything());
  });

  it("shows resetTokenInvalid message when the token is rejected", async () => {
    server.use(
      http.post("/api/auth/reset-password", () =>
        HttpResponse.json({ key: "auth.reset_token_invalid" }, { status: 400 })
      )
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm />);

    await fillValidPasswords(user);
    await user.click(screen.getByRole("button", { name: "auth.resetPasswordSubmit" }));

    await waitFor(() => expect(screen.getByText("auth.resetTokenInvalid")).toBeInTheDocument());
  });

  it("shows a generic error on an unrelated 500", async () => {
    server.use(http.post("/api/auth/reset-password", () => HttpResponse.json({}, { status: 500 })));
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm />);

    await fillValidPasswords(user);
    await user.click(screen.getByRole("button", { name: "auth.resetPasswordSubmit" }));

    await waitFor(() => expect(screen.getByText("auth.genericError")).toBeInTheDocument());
  });
});
