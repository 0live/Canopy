import { ProfilePanel } from "@/features/userProfile/components/profile/ProfilePanel";
import { useAppStore } from "@/shared/store";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { mockUser, userProfileHandlers } from "../../mocks/handlers";

describe("ProfilePanel", () => {
  beforeEach(() => {
    useAppStore.setState({ accessToken: "tok" });
    server.use(...userProfileHandlers);
  });

  it("renders nothing when there is no current user", async () => {
    useAppStore.setState({ accessToken: null });
    const { container } = renderWithProviders(<ProfilePanel />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("prefills identity fields with the current user's data", async () => {
    renderWithProviders(<ProfilePanel />);

    await waitFor(() =>
      expect(screen.getByDisplayValue(mockUser.username)).toBeInTheDocument()
    );
    expect(screen.getByDisplayValue(mockUser.email)).toBeInTheDocument();
  });

  it("renders a current password field in the password section", async () => {
    renderWithProviders(<ProfilePanel />);

    expect(await screen.findByLabelText("profile.currentPassword")).toBeInTheDocument();
  });

  it("shows a validation error when the username is cleared", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePanel />);

    await waitFor(() =>
      expect(screen.getByDisplayValue(mockUser.username)).toBeInTheDocument()
    );

    await user.clear(screen.getByDisplayValue(mockUser.username));
    await user.click(screen.getAllByRole("button", { name: "profile.saveChanges" })[0]);

    expect(await screen.findByText("auth.requiredUsername")).toBeInTheDocument();
  });

  it("submits only the changed field and shows a success toast", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch("/api/users/:userId", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(mockUser);
      })
    );
    const user = userEvent.setup();
    renderWithProviders(<ProfilePanel />);

    const usernameInput = await screen.findByDisplayValue(mockUser.username);
    await user.clear(usernameInput);
    await user.type(usernameInput, "newname");
    await user.click(screen.getAllByRole("button", { name: "profile.saveChanges" })[0]);

    await waitFor(() => expect(capturedBody).toEqual({ username: "newname" }));
    expect(toast.success).toHaveBeenCalled();
  });

  it("maps a username_exists server error onto the username field", async () => {
    server.use(
      http.patch("/api/users/:userId", () =>
        HttpResponse.json({ key: "user.username_exists" }, { status: 409 })
      )
    );
    const user = userEvent.setup();
    renderWithProviders(<ProfilePanel />);

    const usernameInput = await screen.findByDisplayValue(mockUser.username);
    await user.clear(usernameInput);
    await user.type(usernameInput, "taken");
    await user.click(screen.getAllByRole("button", { name: "profile.saveChanges" })[0]);

    expect(await screen.findByText("user.username_exists")).toBeInTheDocument();
  });
});
