import { UsersTable } from "@/features/admin/components/users/UsersTable";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockAdminUser, mockRegularUser } from "../../mocks/handlers";

const defaultProps = {
  users: [mockAdminUser, mockRegularUser],
  isLoading: false,
  currentUserId: 99,
  onEditRoles: vi.fn(),
  onDelete: vi.fn(),
};

describe("UsersTable", () => {
  it("renders skeleton rows when loading without showing user data", () => {
    renderWithProviders(<UsersTable {...defaultProps} isLoading={true} />);

    expect(screen.queryByText(mockAdminUser.username)).not.toBeInTheDocument();
    expect(screen.queryByText("admin.users.noUsers")).not.toBeInTheDocument();
  });

  it("renders empty state when users list is empty", () => {
    renderWithProviders(<UsersTable {...defaultProps} users={[]} />);

    expect(screen.getByText("admin.users.noUsers")).toBeInTheDocument();
  });

  it("renders username and email for each user", () => {
    renderWithProviders(<UsersTable {...defaultProps} />);

    expect(screen.getByText(mockAdminUser.username)).toBeInTheDocument();
    expect(screen.getByText(mockAdminUser.email)).toBeInTheDocument();
    expect(screen.getByText(mockRegularUser.username)).toBeInTheDocument();
    expect(screen.getByText(mockRegularUser.email)).toBeInTheDocument();
  });

  it("hides delete action for the current user row", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersTable {...defaultProps} currentUserId={mockAdminUser.id} />);

    const adminRow = screen.getByText(mockAdminUser.username).closest("tr")!;
    await user.click(within(adminRow).getByRole("button"));

    expect(screen.queryByText("admin.users.deleteUser")).not.toBeInTheDocument();
  });

  it("calls onEditRoles with the correct user", async () => {
    const onEditRoles = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<UsersTable {...defaultProps} onEditRoles={onEditRoles} />);

    const aliceRow = screen.getByText(mockRegularUser.username).closest("tr")!;
    await user.click(within(aliceRow).getByRole("button"));
    await user.click(screen.getByText("admin.users.editRoles"));

    expect(onEditRoles).toHaveBeenCalledWith(mockRegularUser);
  });

  it("calls onDelete with the correct user", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<UsersTable {...defaultProps} onDelete={onDelete} />);

    const aliceRow = screen.getByText(mockRegularUser.username).closest("tr")!;
    await user.click(within(aliceRow).getByRole("button"));
    await user.click(screen.getByText("admin.users.deleteUser"));

    expect(onDelete).toHaveBeenCalledWith(mockRegularUser);
  });

  it("renders the ADMIN role badge in the primary color", () => {
    renderWithProviders(<UsersTable {...defaultProps} />);

    const adminRow = screen.getByText(mockAdminUser.username).closest("tr")!;
    const regularRow = screen.getByText(mockRegularUser.username).closest("tr")!;

    const adminBadge = within(adminRow).getByText("admin.users.roleLabels.ADMIN");
    const userBadge = within(regularRow).getByText("admin.users.roleLabels.USER");

    expect(adminBadge).toHaveClass("bg-primary");
    expect(userBadge).not.toHaveClass("bg-primary");
    expect(userBadge).toHaveClass("bg-secondary");
  });
});
