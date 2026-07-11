import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { authHandlers } from "../mocks/handlers";

describe("ForgotPasswordForm", () => {
  beforeEach(() => { server.use(...authHandlers); });

  it("renders email field and submit button", () => {
    renderWithProviders(<ForgotPasswordForm />);
    expect(screen.getByLabelText("auth.email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "auth.forgotPasswordSubmit" })).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordForm />);

    await user.click(screen.getByRole("button", { name: "auth.forgotPasswordSubmit" }));

    await waitFor(() => expect(screen.getByText("auth.requiredEmail")).toBeInTheDocument());
  });

  it("shows the success message after a valid submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("auth.email"), "alice@example.com");
    await user.click(screen.getByRole("button", { name: "auth.forgotPasswordSubmit" }));

    await waitFor(() => expect(screen.getByText("auth.forgotPasswordSuccess")).toBeInTheDocument());
  });

  it("shows a server error on 500", async () => {
    server.use(http.post("/api/auth/forgot-password", () => HttpResponse.json({}, { status: 500 })));
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("auth.email"), "alice@example.com");
    await user.click(screen.getByRole("button", { name: "auth.forgotPasswordSubmit" }));

    await waitFor(() => expect(screen.getByText("auth.genericError")).toBeInTheDocument());
  });
});
