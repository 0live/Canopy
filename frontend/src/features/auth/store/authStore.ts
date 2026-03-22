import { STORAGE_KEYS } from "@/shared/constants/storageKeys";
import type { StateCreator } from "zustand";
import type { VerifyingStatus } from "../types";

export interface AuthSlice {
  accessToken: string | null;
  isLoading: boolean;
  verifyingStatus: VerifyingStatus;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
  setVerifyingStatus: (status: VerifyingStatus) => void;
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set) => ({
  accessToken: null,
  isLoading: localStorage.getItem(STORAGE_KEYS.AUTH_SESSION) === "true",
  verifyingStatus: null,

  setAccessToken: (token) => {
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, "true");
    set({ accessToken: token });
  },

  clearAuth: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    set({ accessToken: null, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
  setVerifyingStatus: (status) => set({ verifyingStatus: status }),
});
