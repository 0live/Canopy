import { SetupRootUserForm } from "@/features/setupRootUser/components/SetupRootUserForm";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { setupRootUserHandlers } from "../mocks/handlers";

const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams("token=setup-token-123");

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
  };
});

async function fillValidValues(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("auth.email"), "admin@canopy.dev");
  await user.type(screen.getByLabelText("auth.username"), "admin");
  await user.type(screen.getByLabelText("auth.password"), "supersecret1234");
}

describe("SetupRootUserForm", () => {
  beforeEach(() => { server.use(...setupRootUserHandlers); });

  it("renders the setup fields and submit button", () => {
    renderWithProviders(<SetupRootUserForm />);
    expect(screen.getByLabelText("auth.email")).toBeInTheDocument();
    expect(screen.getByLabelText("auth.username")).toBeInTheDocument();
    expect(screen.getByLabelText("auth.password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "setupRootUser.submit" })).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SetupRootUserForm />);

    await user.click(screen.getByRole("button", { name: "setupRootUser.submit" }));

    await waitFor(() => expect(screen.getByText("auth.requiredEmail")).toBeInTheDocument());
  });

  it("toasts success and navigates home after a valid submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SetupRootUserForm />);

    await fillValidValues(user);
    await user.click(screen.getByRole("button", { name: "setupRootUser.submit" }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(toast.success).toHaveBeenCalledWith("setupRootUser.success", expect.anything());
  });

  it("shows setupRootUser.tokenInvalid message when the token is rejected", async () => {
    server.use(
      http.post("/api/setup/complete", () =>
        HttpResponse.json({ key: "setup_root_user.token_invalid" }, { status: 401 })
      )
    );
    const user = userEvent.setup();
    renderWithProviders(<SetupRootUserForm />);

    await fillValidValues(user);
    await user.click(screen.getByRole("button", { name: "setupRootUser.submit" }));

    await waitFor(() => expect(screen.getByText("setupRootUser.tokenInvalid")).toBeInTheDocument());
  });

  it("shows a generic error on an unrelated 500", async () => {
    server.use(http.post("/api/setup/complete", () => HttpResponse.json({}, { status: 500 })));
    const user = userEvent.setup();
    renderWithProviders(<SetupRootUserForm />);

    await fillValidValues(user);
    await user.click(screen.getByRole("button", { name: "setupRootUser.submit" }));

    await waitFor(() => expect(screen.getByText("auth.genericError")).toBeInTheDocument());
  });
});
