import { AdminNav } from "@/features/admin/components/AdminNav";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: "/admin/users" }),
  };
});

vi.mock("@/shared/hooks/use-mobile");

describe("AdminNav", () => {
  beforeEach(() => {
    vi.mocked(useIsMobile).mockReturnValue(false);
  });

  it("renders tab buttons for all panels in desktop mode", () => {
    renderWithProviders(<AdminNav />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "admin.nav.users" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "admin.nav.teams" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "admin.nav.atlases" })).toBeInTheDocument();
  });

  it("navigates to the correct panel on tab click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminNav />);

    await user.click(screen.getByRole("button", { name: "admin.nav.teams" }));

    expect(mockNavigate).toHaveBeenCalledWith("/admin/teams");
  });

  it("renders Select combobox instead of nav in mobile mode", () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    renderWithProviders(<AdminNav />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
