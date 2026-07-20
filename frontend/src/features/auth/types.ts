import type { UseFormReturn } from "react-hook-form";
import type { RegisterFormData } from "./services/form/registerSchema";


export interface TeamSummary {
  id: number;
  name: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  roles: string[];
  is_verified: boolean;
  postgis_role_created: boolean;
  teams: TeamSummary[];
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  altcha_payload: string;
}

export type EmailVerificationResponse = AuthTokens;

export type VerifyingStatus = null | "success" | "error";

export interface ForgotPasswordCredentials {
  email: string;
}

export interface ResetPasswordCredentials {
  token: string;
  new_password: string;
}

export interface AuthConfig {
  allow_self_registration: boolean;
}

export type CaptchaFieldProps = { form: UseFormReturn<RegisterFormData> };

