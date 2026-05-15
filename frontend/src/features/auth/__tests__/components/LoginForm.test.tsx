import { LoginForm } from "@/features/auth/components/LoginForm";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { authHandlers } from "../mocks/handlers";

describe("LoginForm", () => {
  beforeEach(() => { server.use(...authHandlers); });
  it("renders username/password fields and submit button", () => {
    renderWithProviders(<LoginForm />);
    expect(screen.getByLabelText("auth.username")).toBeInTheDocument();
    expect(screen.getByLabelText("auth.password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "auth.login" })).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole("button", { name: "auth.login" }));

    await waitFor(() => {
      expect(screen.getByText("auth.requiredUsername")).toBeInTheDocument();
      expect(screen.getByText("auth.requiredPassword")).toBeInTheDocument();
    });
  });

  it("calls onSuccess after valid submit", async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("auth.username"), "alice");
    await user.type(screen.getByLabelText("auth.password"), "secret");
    await user.click(screen.getByRole("button", { name: "auth.login" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("shows server error on wrong credentials", async () => {
    server.use(http.post("/api/auth/login", () => HttpResponse.json({}, { status: 401 })));
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText("auth.username"), "alice");
    await user.type(screen.getByLabelText("auth.password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "auth.login" }));

    await waitFor(() => expect(screen.getByText("auth.loginError")).toBeInTheDocument());
  });

  it("shows forgot password link when onForgotPassword is provided", async () => {
    const onForgotPassword = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<LoginForm onForgotPassword={onForgotPassword} />);

    const forgotBtn = screen.getByRole("button", { name: "auth.forgotPassword" });
    expect(forgotBtn).toBeInTheDocument();
    await user.click(forgotBtn);
    expect(onForgotPassword).toHaveBeenCalled();
  });

  it("does not show forgot password link when onForgotPassword is absent", () => {
    renderWithProviders(<LoginForm />);
    expect(screen.queryByRole("button", { name: "auth.forgotPassword" })).not.toBeInTheDocument();
  });
});
