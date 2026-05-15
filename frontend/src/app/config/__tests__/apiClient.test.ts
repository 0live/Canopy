import { apiClient } from "@/app/config/apiClient";
import { showToast } from "@/shared/utils/toast";
import { ToastType } from "@/shared/types/Toast";
import { useAppStore } from "@/shared/store";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

vi.mock("@/shared/utils/toast", () => ({ showToast: vi.fn() }));
vi.mock("i18next", () => ({ default: { t: (key: string) => key } }));

const showToastMock = vi.mocked(showToast);

afterEach(() => {
  delete apiClient.defaults.headers.common["Authorization"];
});

describe("apiClient — request interceptor", () => {
  it("injects Bearer token when accessToken is in the store", async () => {
    useAppStore.setState({ accessToken: "my-token" });
    let authHeader: string | null = null;

    server.use(
      http.get("/api/protected", ({ request }) => {
        authHeader = request.headers.get("authorization");
        return HttpResponse.json({ ok: true });
      })
    );

    await apiClient.get("/protected");

    expect(authHeader).toBe("Bearer my-token");
  });

  it("omits Authorization header when store has no token", async () => {
    let authHeader: string | null = null;

    server.use(
      http.get("/api/protected", ({ request }) => {
        authHeader = request.headers.get("authorization");
        return HttpResponse.json({ ok: true });
      })
    );

    await apiClient.get("/protected");

    expect(authHeader).toBeNull();
  });
});

describe("apiClient — response interceptor: network errors", () => {
  it("shows networkError toast and rejects when there is no response", async () => {
    server.use(http.get("/api/data", () => HttpResponse.error()));

    await expect(apiClient.get("/data")).rejects.toThrow();

    expect(showToastMock).toHaveBeenCalledWith("errors.networkError", ToastType.Critical);
  });
});

describe("apiClient — response interceptor: 401 and token refresh", () => {
  it("clears auth without refreshing when 401 comes from /auth/login", async () => {
    useAppStore.setState({ accessToken: "token" });
    server.use(
      http.post("/api/auth/login", () => HttpResponse.json({}, { status: 401 }))
    );

    await expect(apiClient.post("/auth/login", {})).rejects.toThrow();

    expect(useAppStore.getState().accessToken).toBeNull();
  });

  it("clears auth without refreshing when 401 comes from /auth/refresh", async () => {
    useAppStore.setState({ accessToken: "token" });
    server.use(
      http.post("/api/auth/refresh", () => HttpResponse.json({}, { status: 401 }))
    );

    await expect(apiClient.post("/auth/refresh", {})).rejects.toThrow();

    expect(useAppStore.getState().accessToken).toBeNull();
  });

  it("refreshes token and retries original request on 401", async () => {
    useAppStore.setState({ accessToken: "expired-token" });
    const NEW_TOKEN = "refreshed-token";
    let callCount = 0;

    server.use(
      http.get("/api/users/me", () => {
        callCount++;
        return callCount === 1
          ? HttpResponse.json({}, { status: 401 })
          : HttpResponse.json({ username: "alice" });
      }),
      http.post("/api/auth/refresh", () =>
        HttpResponse.json({ access_token: NEW_TOKEN })
      )
    );

    const response = await apiClient.get("/users/me");

    expect(callCount).toBe(2);
    expect(response.data.username).toBe("alice");
    expect(useAppStore.getState().accessToken).toBe(NEW_TOKEN);
  });

  it("clears auth and rejects when refresh itself fails", async () => {
    useAppStore.setState({ accessToken: "expired-token" });

    server.use(
      http.get("/api/users/me", () => HttpResponse.json({}, { status: 401 })),
      http.post("/api/auth/refresh", () => HttpResponse.json({}, { status: 401 }))
    );

    await expect(apiClient.get("/users/me")).rejects.toThrow();

    expect(useAppStore.getState().accessToken).toBeNull();
  });

  it("queues concurrent 401 requests and retries all after a single refresh", async () => {
    useAppStore.setState({ accessToken: "expired-token" });
    const NEW_TOKEN = "refreshed-token";
    let profileCalls = 0;
    let settingsCalls = 0;

    server.use(
      http.get("/api/users/me", () => {
        profileCalls++;
        return profileCalls === 1
          ? HttpResponse.json({}, { status: 401 })
          : HttpResponse.json({ username: "alice" });
      }),
      http.get("/api/settings", () => {
        settingsCalls++;
        return settingsCalls === 1
          ? HttpResponse.json({}, { status: 401 })
          : HttpResponse.json({ theme: "dark" });
      }),
      http.post("/api/auth/refresh", () =>
        HttpResponse.json({ access_token: NEW_TOKEN })
      )
    );

    const [profile, settings] = await Promise.all([
      apiClient.get("/users/me"),
      apiClient.get("/settings"),
    ]);

    expect(profile.data.username).toBe("alice");
    expect(settings.data.theme).toBe("dark");
    expect(useAppStore.getState().accessToken).toBe(NEW_TOKEN);
  });

  it("rejects all queued requests when refresh fails", async () => {
    useAppStore.setState({ accessToken: "expired-token" });

    server.use(
      http.get("/api/users/me", () => HttpResponse.json({}, { status: 401 })),
      http.get("/api/settings", () => HttpResponse.json({}, { status: 401 })),
      http.post("/api/auth/refresh", () => HttpResponse.json({}, { status: 401 }))
    );

    const results = await Promise.allSettled([
      apiClient.get("/users/me"),
      apiClient.get("/settings"),
    ]);

    expect(results[0].status).toBe("rejected");
    expect(results[1].status).toBe("rejected");
    expect(useAppStore.getState().accessToken).toBeNull();
  });
});

describe("apiClient — response interceptor: other HTTP errors", () => {
  it("shows forbidden toast on 403", async () => {
    server.use(http.get("/api/admin", () => HttpResponse.json({}, { status: 403 })));

    await expect(apiClient.get("/admin")).rejects.toThrow();

    expect(showToastMock).toHaveBeenCalledWith("errors.forbidden", ToastType.Critical);
  });

  it("shows tooManyRequests toast on 429", async () => {
    server.use(http.get("/api/data", () => HttpResponse.json({}, { status: 429 })));

    await expect(apiClient.get("/data")).rejects.toThrow();

    expect(showToastMock).toHaveBeenCalledWith("errors.tooManyRequests", ToastType.Info);
  });

  it("shows serverError toast on 500", async () => {
    server.use(http.get("/api/data", () => HttpResponse.json({}, { status: 500 })));

    await expect(apiClient.get("/data")).rejects.toThrow();

    expect(showToastMock).toHaveBeenCalledWith("errors.serverError", ToastType.Critical);
  });
});
