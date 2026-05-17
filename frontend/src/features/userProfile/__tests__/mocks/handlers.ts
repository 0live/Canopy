import type { User } from "@/features/auth/types";
import type { DatabaseAccessStatus, Notification } from "@/features/userProfile/types";
import { NotificationType } from "@/features/userProfile/types";
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

export const mockNotification: Notification = {
  id: 1,
  type: NotificationType.INFO,
  key: null,
  payload: null,
  is_read: false,
  created_at: "2024-01-01T00:00:00Z",
};

export const mockDbStatusInactive: DatabaseAccessStatus = {
  has_access: false,
  is_activated: false,
  role_name: null,
};

export const mockDbStatusActive: DatabaseAccessStatus = {
  has_access: true,
  is_activated: true,
  role_name: "user_1",
};

export const userProfileHandlers = [
  http.get("/api/users/me", () =>
    HttpResponse.json(mockUser, { status: 200 })
  ),

  http.patch("/api/users/:userId", () =>
    HttpResponse.json(mockUser, { status: 200 })
  ),

  http.get("/api/notifications", ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("unread_only") === "true") {
      return HttpResponse.json([mockNotification], { status: 200 });
    }
    return HttpResponse.json({ items: [mockNotification], total: 1 }, { status: 200 });
  }),

  http.patch("/api/notifications/read-all", () =>
    HttpResponse.json({}, { status: 200 })
  ),

  http.post("/api/notifications/bulk-delete", () =>
    HttpResponse.json({}, { status: 200 })
  ),

  http.get("/api/database-access/status", () =>
    HttpResponse.json(mockDbStatusInactive, { status: 200 })
  ),

  http.post("/api/database-access/activate", () =>
    HttpResponse.json({ role_name: "user_1", message: "Activated" }, { status: 201 })
  ),

  http.patch("/api/database-access/password", () =>
    HttpResponse.json({}, { status: 200 })
  ),
];
