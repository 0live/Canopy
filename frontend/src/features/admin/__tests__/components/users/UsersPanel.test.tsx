import { UsersPanel } from "@/features/admin/components/users/UsersPanel";
import { authHandlers } from "@/features/auth/__tests__/mocks/handlers";
import { useAppStore } from "@/shared/store";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { adminHandlers, mockRegularUser } from "../../mocks/handlers";

describe("UsersPanel", () => {
  beforeEach(() => {
    useAppStore.setState({ accessToken: "tok" });
    server.use(...authHandlers, ...adminHandlers);
  });

  it("renders user data after loading", async () => {
    renderWithProviders(<UsersPanel />);

    await waitFor(() =>
      expect(screen.getByText(mockRegularUser.username)).toBeInTheDocument()
    );
  });

  it("opens UserRoleDialog when edit roles is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersPanel />);

    await waitFor(() =>
      expect(screen.getByText(mockRegularUser.username)).toBeInTheDocument()
    );

    const aliceRow = screen.getByText(mockRegularUser.username).closest("tr")!;
    await user.click(within(aliceRow).getByRole("button"));
    await user.click(screen.getByText("admin.users.editRoles"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens DeleteUserDialog when delete is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersPanel />);

    await waitFor(() =>
      expect(screen.getByText(mockRegularUser.username)).toBeInTheDocument()
    );

    const aliceRow = screen.getByText(mockRegularUser.username).closest("tr")!;
    await user.click(within(aliceRow).getByRole("button"));
    await user.click(screen.getByText("admin.users.deleteUser"));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("renders nothing when users API returns an error", async () => {
    server.use(
      http.get("/api/users", () => new HttpResponse(null, { status: 500 }))
    );
    const { container } = renderWithProviders(<UsersPanel />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
