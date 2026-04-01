import { apiClient } from "@/app/config/apiClient";
import type { AuthTokens, ForgotPasswordCredentials, LoginCredentials, RegisterCredentials, ResetPasswordCredentials, User, EmailVerificationResponse } from "../../types";

export const CAPTCHA_CHALLENGE_URL = `${apiClient.defaults.baseURL}/auth/captcha/challenge`;

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    const params = new URLSearchParams();
    params.append("username", credentials.username);
    params.append("password", credentials.password);
    
    const { data } = await apiClient.post<AuthTokens>("/auth/login", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return data;
  },

  register: async (credentials: RegisterCredentials): Promise<User> => {
    const { data } = await apiClient.post<User>("/auth/register", credentials);
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  refreshToken: async (): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>("/auth/refresh");
    return data;
  },

  fetchCurrentUser: async (): Promise<User> => {
    const { data } = await apiClient.get<User>("/users/me");
    return data;
  },

  verifyEmail: async (token: string): Promise<EmailVerificationResponse> => {
    const { data } = await apiClient.get<EmailVerificationResponse>(
      `/auth/verify?token=${encodeURIComponent(token)}`
    );
    return data;
  },

  forgotPassword: async (credentials: ForgotPasswordCredentials): Promise<void> => {
    await apiClient.post("/auth/forgot-password", credentials);
  },

  resetPassword: async (credentials: ResetPasswordCredentials): Promise<void> => {
    await apiClient.post("/auth/reset-password", credentials);
  },
};
