import { queryClient } from "@/app/config/queryClient";
import { QUERY_KEYS } from "@/shared/constants/queryKeys";
import { useAppStore } from "@/shared/store";
import { showToast } from "@/shared/utils/toast";
import { ToastType } from "@/shared/types/Toast";
import axios from "axios";
import i18next from "i18next";

export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAppStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const SKIP_REFRESH_URLS = ["/auth/refresh", "/auth/login"];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Network error (offline, CORS, timeout) — no response from server
    if (!error.response) {
      showToast(i18next.t("errors.networkError"), ToastType.Critical);
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    const status = error.response.status;

    if (status === 401 && !originalRequest._retry) {
      if (SKIP_REFRESH_URLS.some((url) => originalRequest.url === url)) {
        useAppStore.getState().clearAuth();
        queryClient.removeQueries({ queryKey: QUERY_KEYS.AUTH.CURRENT_USER() });
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          "/api/auth/refresh",
          {},
          { withCredentials: true }
        );
        useAppStore.getState().setAccessToken(data.access_token);
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        processQueue(null, data.access_token);
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        useAppStore.getState().clearAuth();
        queryClient.removeQueries({ queryKey: QUERY_KEYS.AUTH.CURRENT_USER() });
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 403) {
      showToast(i18next.t("errors.forbidden"), ToastType.Critical);
    }

    if (status === 429) {
      showToast(i18next.t("errors.tooManyRequests"), ToastType.Info);
    }

    if (status >= 500) {
      showToast(i18next.t("errors.serverError"), ToastType.Critical);
    }

    return Promise.reject(error);
  }
);
