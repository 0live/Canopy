import type { AdminUserSummary } from "@/features/admin/types";
import { UserRole } from "@/shared/types/UserRole";
import { HttpResponse, http } from "msw";

export const mockAdminUser: AdminUserSummary = {
  id: 1,
  username: "admin",
  email: "admin@example.com",
  roles: [UserRole.USER, UserRole.ADMIN],
  is_verified: true,
};

export const mockRegularUser: AdminUserSummary = {
  id: 2,
  username: "alice",
  email: "alice@example.com",
  roles: [UserRole.USER],
  is_verified: true,
};

export const mockPaginatedUsers = {
  items: [mockAdminUser, mockRegularUser],
  total: 2,
  skip: 0,
  limit: 25,
};

export const mockCreatedUser: AdminUserSummary = {
  id: 3,
  username: "newuser",
  email: "newuser@example.com",
  roles: [UserRole.USER],
  is_verified: true,
};

export const adminHandlers = [
  http.get("/api/users", () =>
    HttpResponse.json(mockPaginatedUsers, { status: 200 })
  ),

  http.post("/api/users", () =>
    HttpResponse.json(mockCreatedUser, { status: 200 })
  ),

  http.delete("/api/users/:userId", () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.put("/api/users/:userId/roles", () =>
    HttpResponse.json(mockAdminUser, { status: 200 })
  ),
];
