import type { User } from "@/features/auth/types";
import { HttpResponse, http } from "msw";

export const mockRootUser: User = {
  id: 1,
  email: "admin@canopy.dev",
  username: "admin",
  roles: ["ADMIN"],
  is_verified: true,
  postgis_role_created: false,
  teams: [],
};

export const setupRootUserHandlers = [
  http.post("/api/setup/complete", () => HttpResponse.json(mockRootUser, { status: 200 })),
];
