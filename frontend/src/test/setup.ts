import { server } from "@/test/mocks/server";
import { resetStore } from "@/test/utils/renderWithProviders";
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Suppress sonner toasts — side effects not relevant in tests
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// jsdom doesn't implement ResizeObserver, which Radix UI primitives
// (e.g. Checkbox, Slider, Switch) rely on internally.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetStore();
  vi.clearAllMocks();
});
afterAll(() => server.close());
