// Factory prevents Vitest from loading the real module (auto-mock would still run side effects)
vi.mock("altcha", () => ({}));

import { AuthDialog } from "@/features/auth/components/AuthDialog";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { authHandlers } from "../mocks/handlers";

describe("AuthDialog", () => {
  beforeEach(() => { server.use(...authHandlers); });

  async function openDialog() {
    const user = userEvent.setup();
    renderWithProviders(<AuthDialog><button>open</button></AuthDialog>);
    await user.click(screen.getByRole("button", { name: "open" }));
    return user;
  }

  it("shows login and register tabs when self-registration is allowed", async () => {
    await openDialog();

    await waitFor(() => expect(screen.getByRole("tab", { name: "auth.login" })).toBeInTheDocument());
    expect(screen.getByRole("tab", { name: "auth.register" })).toBeInTheDocument();
  });

  it("hides the register tab and shows only the login form when self-registration is disabled", async () => {
    server.use(
      http.get("/api/auth/config", () =>
        HttpResponse.json({ allow_self_registration: false }, { status: 200 })
      )
    );

    await openDialog();

    await waitFor(() => expect(screen.getByLabelText("auth.username")).toBeInTheDocument());
    expect(screen.queryByRole("tab", { name: "auth.register" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "auth.login" })).not.toBeInTheDocument();
  });
});
