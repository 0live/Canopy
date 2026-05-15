import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { renderWithProviders } from "@/test/utils/renderWithProviders";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const defaultProps = {
  page: 0,
  pageSize: 25,
  total: 50,
  isFetching: false,
  onPageChange: vi.fn(),
};

describe("AdminPagination", () => {
  it("disables previous button on first page", () => {
    renderWithProviders(<AdminPagination {...defaultProps} page={0} />);

    expect(screen.getByRole("button", { name: "admin.pagination.previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "admin.pagination.next" })).toBeEnabled();
  });

  it("disables next button on last page", () => {
    renderWithProviders(<AdminPagination {...defaultProps} page={1} />);

    expect(screen.getByRole("button", { name: "admin.pagination.next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "admin.pagination.previous" })).toBeEnabled();
  });

  it("disables both buttons when isFetching", () => {
    renderWithProviders(<AdminPagination {...defaultProps} isFetching={true} />);

    expect(screen.getByRole("button", { name: "admin.pagination.previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "admin.pagination.next" })).toBeDisabled();
  });

  it("disables both buttons when total is 0", () => {
    renderWithProviders(<AdminPagination {...defaultProps} total={0} />);

    expect(screen.getByRole("button", { name: "admin.pagination.previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "admin.pagination.next" })).toBeDisabled();
  });

  it("calls onPageChange with page + 1 on next click", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<AdminPagination {...defaultProps} page={0} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: "admin.pagination.next" }));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("calls onPageChange with page - 1 on previous click", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<AdminPagination {...defaultProps} page={1} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: "admin.pagination.previous" }));

    expect(onPageChange).toHaveBeenCalledWith(0);
  });
});
