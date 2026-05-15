import { UserRoleDialog } from "@/features/admin/components/users/UserRoleDialog";
import { UserRole } from "@/shared/types/UserRole";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { adminHandlers, mockRegularUser } from "../../mocks/handlers";

describe("UserRoleDialog", () => {
  beforeEach(() => { server.use(...adminHandlers); });

  it("pre-checks roles based on user.roles", () => {
    renderWithProviders(
      <UserRoleDialog user={mockRegularUser} open={true} onClose={vi.fn()} />
    );

    expect(
      screen.getByRole("checkbox", { name: `admin.users.roleLabels.${UserRole.USER}` })
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: `admin.users.roleLabels.${UserRole.ADMIN}` })
    ).not.toBeChecked();
  });

  it("calls onClose on cancel without triggering mutation", async () => {
    const putSpy = vi.fn();
    server.use(
      http.put("/api/users/:userId/roles", () => {
        putSpy();
        return HttpResponse.json(mockRegularUser);
      })
    );
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <UserRoleDialog user={mockRegularUser} open={true} onClose={onClose} />
    );

    await user.click(screen.getByRole("button", { name: "admin.users.cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(putSpy).not.toHaveBeenCalled();
  });

  it("calls onClose after successful save", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <UserRoleDialog user={mockRegularUser} open={true} onClose={onClose} />
    );

    await user.click(screen.getByRole("button", { name: "admin.users.saveRoles" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("disables both buttons while request is pending", async () => {
    server.use(
      http.put("/api/users/:userId/roles", () => new Promise(() => {}))
    );
    const user = userEvent.setup();
    renderWithProviders(
      <UserRoleDialog user={mockRegularUser} open={true} onClose={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "admin.users.saveRoles" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "admin.users.saveRoles" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "admin.users.cancel" })).toBeDisabled();
    });
  });

  it("does not call onClose on API error", async () => {
    server.use(
      http.put("/api/users/:userId/roles", () => new HttpResponse(null, { status: 500 }))
    );
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <UserRoleDialog user={mockRegularUser} open={true} onClose={onClose} />
    );

    await user.click(screen.getByRole("button", { name: "admin.users.saveRoles" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
