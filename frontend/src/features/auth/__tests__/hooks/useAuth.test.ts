import { canLoadData, canWithDbAccess } from "@/features/auth/hooks/useAuth";
import type { User } from "@/features/auth/types";
import { UserRole } from "@/shared/types/UserRole";

const buildUser = (roles: string[]): User => ({
  id: 1,
  email: "user@example.com",
  username: "user",
  roles,
  is_verified: true,
  postgis_role_created: false,
  teams: [],
});

describe("canWithDbAccess", () => {
  it("returns false when user is undefined", () => {
    expect(canWithDbAccess(undefined)).toBe(false);
  });

  it("returns false for a user with only the ADMIN role", () => {
    expect(canWithDbAccess(buildUser([UserRole.USER, UserRole.ADMIN]))).toBe(false);
  });

  it("returns true for a user with the WITHDBACCESS role", () => {
    expect(canWithDbAccess(buildUser([UserRole.USER, UserRole.WITHDBACCESS]))).toBe(true);
  });

  it("returns true for a user with both ADMIN and WITHDBACCESS roles", () => {
    expect(
      canWithDbAccess(buildUser([UserRole.USER, UserRole.ADMIN, UserRole.WITHDBACCESS])),
    ).toBe(true);
  });
});

describe("canLoadData", () => {
  it("returns true for a user with the ADMIN role", () => {
    expect(canLoadData(buildUser([UserRole.USER, UserRole.ADMIN]))).toBe(true);
  });

  it("returns true for a user with the LOAD_DATA role", () => {
    expect(canLoadData(buildUser([UserRole.USER, UserRole.LOAD_DATA]))).toBe(true);
  });

  it("returns false for a user without ADMIN or LOAD_DATA", () => {
    expect(canLoadData(buildUser([UserRole.USER]))).toBe(false);
  });
});
