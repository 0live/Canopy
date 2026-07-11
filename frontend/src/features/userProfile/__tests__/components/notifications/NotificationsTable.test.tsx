import { NotificationsTable } from "@/features/userProfile/components/notifications/NotificationsTable";
import { NotificationKey } from "@/features/userProfile/types";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockNotification } from "../../mocks/handlers";

const readNotification = { ...mockNotification, id: 2, is_read: true };
const rolesChangedNotification = {
  ...mockNotification,
  id: 3,
  key: NotificationKey.ROLES_CHANGED,
  payload: { new_roles: ["ADMIN"] },
};

describe("NotificationsTable", () => {
  it("renders one row per notification with its read status", () => {
    renderWithProviders(
      <NotificationsTable
        notifications={[mockNotification, readNotification]}
        selectedIds={new Set()}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
      />
    );

    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 rows
    expect(screen.getByText("notifications.unread")).toBeInTheDocument();
    expect(screen.getByText("notifications.read")).toBeInTheDocument();
  });

  it("formats a keyed message via formatNotificationMessage", () => {
    renderWithProviders(
      <NotificationsTable
        notifications={[rolesChangedNotification]}
        selectedIds={new Set()}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
      />
    );

    expect(screen.getByText("notifications.messages.ROLES_CHANGED")).toBeInTheDocument();
  });

  it("calls onToggle with the notification id when its checkbox is clicked", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <NotificationsTable
        notifications={[mockNotification]}
        selectedIds={new Set()}
        onToggle={onToggle}
        onToggleAll={vi.fn()}
      />
    );

    await user.click(screen.getAllByRole("checkbox")[1]);

    expect(onToggle).toHaveBeenCalledWith(mockNotification.id);
  });

  it("calls onToggleAll when the header checkbox is toggled", async () => {
    const onToggleAll = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <NotificationsTable
        notifications={[mockNotification]}
        selectedIds={new Set()}
        onToggle={vi.fn()}
        onToggleAll={onToggleAll}
      />
    );

    await user.click(screen.getAllByRole("checkbox")[0]);

    expect(onToggleAll).toHaveBeenCalledWith(true);
  });
});
