import { NotificationsPanel } from "@/features/userProfile/components/notifications/NotificationsPanel";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { mockNotification, userProfileHandlers } from "../../mocks/handlers";

describe("NotificationsPanel", () => {
  beforeEach(() => { server.use(...userProfileHandlers); });

  it("shows a skeleton while loading", () => {
    const { container } = renderWithProviders(<NotificationsPanel />);

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it("renders the empty state when there are no notifications", async () => {
    server.use(
      http.get("/api/notifications", () =>
        HttpResponse.json({ items: [], total: 0 }, { status: 200 })
      )
    );
    renderWithProviders(<NotificationsPanel />);

    expect(await screen.findByText("notifications.empty")).toBeInTheDocument();
  });

  it("renders nothing when the notifications API errors", async () => {
    server.use(http.get("/api/notifications", () => new HttpResponse(null, { status: 500 })));
    const { container } = renderWithProviders(<NotificationsPanel />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("renders the notification list with a disabled delete button by default", async () => {
    renderWithProviders(<NotificationsPanel />);

    await screen.findByText("notifications.newNotification");
    expect(screen.getByRole("button", { name: /notifications.deleteSelected/ })).toBeDisabled();
  });

  it("enables delete after selecting a row and clears selection on success", async () => {
    let deletedIds: unknown;
    server.use(
      http.post("/api/notifications/bulk-delete", async ({ request }) => {
        deletedIds = (await request.json() as { notification_ids: number[] }).notification_ids;
        return HttpResponse.json({});
      })
    );
    const user = userEvent.setup();
    renderWithProviders(<NotificationsPanel />);

    await screen.findByText("notifications.newNotification");
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);

    const deleteButton = screen.getByRole("button", { name: /notifications.deleteSelected/ });
    expect(deleteButton).toBeEnabled();
    await user.click(deleteButton);

    await waitFor(() => expect(deletedIds).toEqual([mockNotification.id]));
    expect(toast.success).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: /notifications.deleteSelected/ })).toBeDisabled());
  });
});
