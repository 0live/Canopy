import { DbAccessPanel } from "@/features/userProfile/components/dbAccess/DbAccessPanel";
import { useAppStore } from "@/shared/store";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { mockDbStatusActive, userProfileHandlers } from "../../mocks/handlers";

describe("DbAccessPanel", () => {
  beforeEach(() => {
    useAppStore.setState({ accessToken: "tok" });
    server.use(...userProfileHandlers);
  });

  it("renders the activation form when access is inactive", async () => {
    renderWithProviders(<DbAccessPanel />);

    expect(await screen.findByText("dbAccess.activateTitle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "dbAccess.activateButton" })).toBeInTheDocument();
  });

  it("renders the active status and update form when access is activated", async () => {
    server.use(
      http.get("/api/database-access/status", () =>
        HttpResponse.json(mockDbStatusActive, { status: 200 })
      )
    );
    renderWithProviders(<DbAccessPanel />);

    expect(await screen.findByText("dbAccess.activeStatus")).toBeInTheDocument();
    expect(screen.getByText(mockDbStatusActive.role_name!)).toBeInTheDocument();
    expect(screen.getByText("dbAccess.updatePasswordTitle")).toBeInTheDocument();
  });

  it("shows a validation error when passwords do not match on activation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DbAccessPanel />);

    await screen.findByText("dbAccess.activateTitle");
    await user.type(screen.getByLabelText("dbAccess.passwordLabel"), "abcdefghijkl");
    await user.type(screen.getByLabelText("auth.confirmPassword"), "differentpass");
    await user.click(screen.getByRole("button", { name: "dbAccess.activateButton" }));

    expect(await screen.findByText("auth.passwordMismatch")).toBeInTheDocument();
  });

  it("activates database access and shows a success toast", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DbAccessPanel />);

    await screen.findByText("dbAccess.activateTitle");
    await user.type(screen.getByLabelText("dbAccess.passwordLabel"), "abcdefghijkl");
    await user.type(screen.getByLabelText("auth.confirmPassword"), "abcdefghijkl");
    await user.click(screen.getByRole("button", { name: "dbAccess.activateButton" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("maps an already_activated server error onto the form", async () => {
    server.use(
      http.post("/api/database-access/activate", () =>
        HttpResponse.json({ key: "db_access.already_activated" }, { status: 409 })
      )
    );
    const user = userEvent.setup();
    renderWithProviders(<DbAccessPanel />);

    await screen.findByText("dbAccess.activateTitle");
    await user.type(screen.getByLabelText("dbAccess.passwordLabel"), "abcdefghijkl");
    await user.type(screen.getByLabelText("auth.confirmPassword"), "abcdefghijkl");
    await user.click(screen.getByRole("button", { name: "dbAccess.activateButton" }));

    expect(await screen.findByText("dbAccess.errors.already_activated")).toBeInTheDocument();
  });

  it("updates the database password and shows a success toast", async () => {
    server.use(
      http.get("/api/database-access/status", () =>
        HttpResponse.json(mockDbStatusActive, { status: 200 })
      )
    );
    const user = userEvent.setup();
    renderWithProviders(<DbAccessPanel />);

    await screen.findByText("dbAccess.updatePasswordTitle");
    await user.type(screen.getByLabelText("dbAccess.passwordLabel"), "abcdefghijkl");
    await user.type(screen.getByLabelText("auth.confirmPassword"), "abcdefghijkl");
    await user.click(screen.getByRole("button", { name: "dbAccess.updatePasswordButton" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });
});
