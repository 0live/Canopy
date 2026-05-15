import { DeleteUserDialog } from "@/features/admin/components/users/DeleteUserDialog";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { adminHandlers, mockRegularUser } from "../../mocks/handlers";

describe("DeleteUserDialog", () => {
  beforeEach(() => { server.use(...adminHandlers); });

  it("renders the confirmation dialog with title", () => {
    renderWithProviders(
      <DeleteUserDialog user={mockRegularUser} open={true} onClose={vi.fn()} />
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("admin.users.deleteConfirmTitle")).toBeInTheDocument();
  });

  it("calls onClose on cancel without triggering deletion", async () => {
    const deleteSpy = vi.fn();
    server.use(
      http.delete("/api/users/:userId", () => {
        deleteSpy();
        return new HttpResponse(null, { status: 204 });
      })
    );
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <DeleteUserDialog user={mockRegularUser} open={true} onClose={onClose} />
    );

    await user.click(screen.getByRole("button", { name: "admin.users.cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("calls onClose after successful deletion", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <DeleteUserDialog user={mockRegularUser} open={true} onClose={onClose} />
    );

    await user.click(screen.getByRole("button", { name: "admin.users.deleteUser" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("calls onClose even when user is not found (404)", async () => {
    server.use(
      http.delete("/api/users/:userId", () => new HttpResponse(null, { status: 404 }))
    );
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <DeleteUserDialog user={mockRegularUser} open={true} onClose={onClose} />
    );

    await user.click(screen.getByRole("button", { name: "admin.users.deleteUser" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
