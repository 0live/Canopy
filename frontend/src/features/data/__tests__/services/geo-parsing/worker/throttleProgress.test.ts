import { throttleProgress } from "@/features/data/services/geo-parsing/worker/throttleProgress";

const INTERVAL_MS = 100;

function setup() {
  let time = 0;
  const onProgress = vi.fn();
  const report = throttleProgress(onProgress, INTERVAL_MS, () => time);
  return { onProgress, report, advance: (ms: number) => (time += ms) };
}

describe("throttleProgress", () => {
  it("lets the first report through, then drops those within the interval", () => {
    const { onProgress, report, advance } = setup();

    report(10, 100);
    advance(INTERVAL_MS - 1);
    report(20, 100);
    advance(1);
    report(30, 100);

    expect(onProgress.mock.calls).toEqual([
      [10, 100],
      [30, 100],
    ]);
  });

  it("always reports completion, even right after another report", () => {
    const { onProgress, report } = setup();

    report(10, 100);
    report(100, 100);

    expect(onProgress).toHaveBeenLastCalledWith(100, 100);
  });
});
