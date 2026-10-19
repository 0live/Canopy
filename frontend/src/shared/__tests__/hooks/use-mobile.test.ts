import { act, renderHook } from "@testing-library/react";
import { useIsMobile } from "@/shared/hooks/use-mobile";

/** jsdom has no matchMedia: this one matches while the viewport is narrower than the query's max-width */
function mockViewport(initialWidth: number) {
  let width = initialWidth;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return width <= Number(/max-width: (\d+)px/.exec(query)?.[1]);
    },
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }));
  return {
    listeners,
    resize(newWidth: number) {
      width = newWidth;
      listeners.forEach((listener) => listener());
    },
  };
}

describe("useIsMobile", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is right from the first render", () => {
    mockViewport(500);
    expect(renderHook(() => useIsMobile()).result.current).toBe(true);
  });

  it("follows the viewport across the breakpoint", () => {
    const viewport = mockViewport(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => viewport.resize(767));
    expect(result.current).toBe(true);
  });

  it("stops listening when unmounted", () => {
    const viewport = mockViewport(1024);
    renderHook(() => useIsMobile()).unmount();
    expect(viewport.listeners.size).toBe(0);
  });
});
