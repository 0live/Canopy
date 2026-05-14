import { createAuthSlice } from "@/features/auth/store/authStore";
import { useAppStore } from "@/shared/store";
import { create } from "zustand";

const STORAGE_KEY = "hasAuthSession";

function createFreshStore() {
  return create(createAuthSlice);
}

describe("authStore — initial state", () => {
  it("sets accessToken: null and isLoading: false without localStorage", () => {
    const store = createFreshStore();
    expect(store.getState().accessToken).toBeNull();
    expect(store.getState().isLoading).toBe(false);
  });

  it("sets isLoading: true when hasAuthSession is in localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "true");
    const store = createFreshStore();
    expect(store.getState().isLoading).toBe(true);
  });
});

describe("authStore — actions", () => {
  it("setAccessToken updates accessToken and writes to localStorage", () => {
    useAppStore.getState().setAccessToken("my-token");
    expect(useAppStore.getState().accessToken).toBe("my-token");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  it("clearAuth resets accessToken and isLoading and removes localStorage key", () => {
    useAppStore.getState().setAccessToken("my-token");
    useAppStore.getState().clearAuth();
    expect(useAppStore.getState().accessToken).toBeNull();
    expect(useAppStore.getState().isLoading).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("setVerifyingStatus updates verifyingStatus", () => {
    useAppStore.getState().setVerifyingStatus("success");
    expect(useAppStore.getState().verifyingStatus).toBe("success");
  });
});
