import { UnreadBadge } from "@/features/userProfile/components/notifications/UnreadBadge";
import { render, screen } from "@testing-library/react";

describe("UnreadBadge", () => {
  it("renders nothing when the count is zero", () => {
    const { container } = render(<UnreadBadge count={0} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the raw count when below the cap", () => {
    render(<UnreadBadge count={5} />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("caps the displayed count at 99+", () => {
    render(<UnreadBadge count={150} />);

    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});
