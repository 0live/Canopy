import { CreateUserDialog } from "@/features/admin/components/users/CreateUserDialog";
import { UserRole } from "@/shared/types/UserRole";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { adminHandlers } from "../../mocks/handlers";

const validData = {
  email: "newuser@example.com",
  username: "newuser123",
  password: "supersecret1234",
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("auth.email"), validData.email);
  await user.type(screen.getByLabelText("auth.username"), validData.username);
  await user.type(screen.getByLabelText("auth.password"), validData.password);
}

describe("CreateUserDialog", () => {
  beforeEach(() => { server.use(...adminHandlers); });

  it("renders email/username/password fields and pre-checks USER role", () => {
    renderWithProviders(<CreateUserDialog open={true} onClose={vi.fn()} />);

    expect(screen.getByLabelText("auth.email")).toBeInTheDocument();
    expect(screen.getByLabelText("auth.username")).toBeInTheDocument();
    expect(screen.getByLabelText("auth.password")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: `admin.users.roleLabels.${UserRole.USER}` })
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: `admin.users.roleLabels.${UserRole.ADMIN}` })
    ).not.toBeChecked();
  });

  it("shows validation errors on empty submit without calling the API", async () => {
    const createSpy = vi.fn();
    server.use(http.post("/api/users", () => { createSpy(); return HttpResponse.json({}, { status: 200 }); }));
    const user = userEvent.setup();
    renderWithProviders(<CreateUserDialog open={true} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "admin.users.createUser" }));

    await waitFor(() => expect(screen.getByText("auth.requiredEmail")).toBeInTheDocument());
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("shows email error on email_exists 409", async () => {
    server.use(
      http.post("/api/users", () => HttpResponse.json({ key: "user.email_exists" }, { status: 409 }))
    );
    const user = userEvent.setup();
    renderWithProviders(<CreateUserDialog open={true} onClose={vi.fn()} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "admin.users.createUser" }));

    await waitFor(() => expect(screen.getByText("user.email_exists")).toBeInTheDocument());
  });

  it("shows username error on username_exists 409", async () => {
    server.use(
      http.post("/api/users", () => HttpResponse.json({ key: "user.username_exists" }, { status: 409 }))
    );
    const user = userEvent.setup();
    renderWithProviders(<CreateUserDialog open={true} onClose={vi.fn()} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "admin.users.createUser" }));

    await waitFor(() => expect(screen.getByText("user.username_exists")).toBeInTheDocument());
  });

  it("toggling a role checkbox includes it in the submitted payload", async () => {
    let capturedBody: Record<string, unknown> = {};
    server.use(
      http.post("/api/users", async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({}, { status: 200 });
      })
    );
    const user = userEvent.setup();
    renderWithProviders(<CreateUserDialog open={true} onClose={vi.fn()} />);

    await fillValidForm(user);
    await user.click(
      screen.getByRole("checkbox", { name: `admin.users.roleLabels.${UserRole.MANAGE_TEAMS}` })
    );
    await user.click(screen.getByRole("button", { name: "admin.users.createUser" }));

    await waitFor(() =>
      expect(capturedBody.roles).toEqual([UserRole.USER, UserRole.MANAGE_TEAMS])
    );
  });

  it("calls onClose and shows success toast on successful submit", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CreateUserDialog open={true} onClose={onClose} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "admin.users.createUser" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
  });

  it("does not call onClose on API error", async () => {
    server.use(
      http.post("/api/users", () => new HttpResponse(null, { status: 500 }))
    );
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CreateUserDialog open={true} onClose={onClose} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "admin.users.createUser" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on cancel without triggering the mutation", async () => {
    const createSpy = vi.fn();
    server.use(http.post("/api/users", () => { createSpy(); return HttpResponse.json({}, { status: 200 }); }));
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CreateUserDialog open={true} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "admin.users.cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
  });
});
