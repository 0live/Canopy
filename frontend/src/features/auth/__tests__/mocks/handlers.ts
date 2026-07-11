import type { AuthTokens, User } from "@/features/auth/types";
import { HttpResponse, http } from "msw";

export const mockUser: User = {
  id: 1,
  email: "test@example.com",
  username: "testuser",
  roles: ["user"],
  is_verified: true,
  postgis_role_created: false,
  teams: [],
};

export const mockTokens: AuthTokens = {
  access_token: "test-access-token",
  token_type: "bearer",
};

export const authHandlers = [
  http.post("/api/auth/login", () =>
    HttpResponse.json(mockTokens, { status: 200 })
  ),

  http.post("/api/auth/register", () =>
    HttpResponse.json(mockUser, { status: 201 })
  ),

  http.get("/api/users/me", () =>
    HttpResponse.json(mockUser, { status: 200 })
  ),

  http.post("/api/auth/forgot-password", () => new HttpResponse(null, { status: 204 })),

  http.post("/api/auth/reset-password", () => new HttpResponse(null, { status: 204 })),

  http.get("/api/auth/verify", () => HttpResponse.json(mockTokens, { status: 200 })),

  http.post("/api/auth/refresh", () => HttpResponse.json(mockTokens, { status: 200 })),
];
