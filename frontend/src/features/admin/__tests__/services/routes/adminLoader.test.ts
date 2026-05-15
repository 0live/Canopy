import { queryClient } from "@/app/config/queryClient";
import { adminLoader } from "@/features/admin/services/routes/adminLoader";
import { mockUser } from "@/features/auth/__tests__/mocks/handlers";
import type { User } from "@/features/auth/types";
import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { useAppStore } from "@/shared/store";
import { UserRole } from "@/shared/types/UserRole";
import { resetStore } from "@/test/utils/renderWithProviders";

const mockAdminUserFull: User = { ...mockUser, roles: [UserRole.USER, UserRole.ADMIN] };

afterEach(() => {
  resetStore();
  queryClient.clear();
});

describe("adminLoader", () => {
  it("redirects to / when no accessToken", () => {
    const result = adminLoader();

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Location")).toBe("/");
  });

  it("redirects to / when user has no ADMIN role", () => {
    useAppStore.setState({ accessToken: "tok" });
    queryClient.setQueryData(QUERY_KEYS.AUTH.CURRENT_USER(), mockUser);

    const result = adminLoader();

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Location")).toBe("/");
  });

  it("returns null when accessToken is present and user has ADMIN role", () => {
    useAppStore.setState({ accessToken: "tok" });
    queryClient.setQueryData(QUERY_KEYS.AUTH.CURRENT_USER(), mockAdminUserFull);

    const result = adminLoader();

    expect(result).toBeNull();
  });
});
