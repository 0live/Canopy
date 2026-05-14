import { useAppStore } from "@/shared/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook } from "@testing-library/react";
import i18next from "i18next";
import type { ReactElement } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";

// cimode makes t() return the key as-is — tests stay independent of translation changes
const testI18n = i18next.createInstance();
testI18n.use(initReactI18next).init({ lng: "cimode", resources: {}, initImmediate: false });

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 0, retry: false },
      mutations: { retry: false },
    },
  });
}

// Centralizes mandatory global providers to ensure test consistency and avoid context boilerplate.
function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={testI18n}>{children}</I18nextProvider>
      </QueryClientProvider>
    );
  };
}

// Automates provider injection to prevent "context not found" errors and ensure a fresh, isolated QueryClient for every test.
export function renderWithProviders(ui: ReactElement) {
  const queryClient = createTestQueryClient();
  return { ...render(ui, { wrapper: makeWrapper(queryClient) }), queryClient };
}

// Provides the required runtime environment for hooks that depend on TanStack Query or translations.
export function renderHookWithProviders<T>(hook: () => T) {
  const queryClient = createTestQueryClient();
  return { ...renderHook(hook, { wrapper: makeWrapper(queryClient) }), queryClient };
}

export function resetStore() {
  useAppStore.setState({ accessToken: null, isLoading: false, verifyingStatus: null });
  localStorage.clear();
}
