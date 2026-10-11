import { RangeCollector } from "@/features/data/services/geo-parsing/archives/rangeCollector";

const bytes = (...values: number[]) => new Uint8Array(values);

function collect(start: number, end: number, chunks: Uint8Array[]) {
  const collector = new RangeCollector(start, end);
  const completions = chunks.map((chunk) => collector.push(chunk));
  return { result: [...new Uint8Array(collector.toArrayBuffer())], completions };
}

describe("RangeCollector", () => {
  it.each([
    ["prefix inside the first chunk", 0, 2, [bytes(0, 1, 2), bytes(3, 4)], [0, 1]],
    ["range spanning two chunks", 1, 4, [bytes(0, 1, 2), bytes(3, 4)], [1, 2, 3]],
    ["range in a later chunk", 3, 5, [bytes(0, 1, 2), bytes(3, 4)], [3, 4]],
    ["range past the stream end", 3, 10, [bytes(0, 1, 2), bytes(3, 4)], [3, 4]],
  ])("keeps the %s", (_label, start, end, chunks, expected) => {
    expect(collect(start, end, chunks).result).toEqual(expected);
  });

  it("signals completion on the chunk reaching the range end", () => {
    const { completions } = collect(0, 4, [bytes(0, 1), bytes(2, 3), bytes(4)]);

    expect(completions).toEqual([false, true, true]);
  });

  it("copies chunks so producer buffer reuse does not corrupt the result", () => {
    const collector = new RangeCollector(0, 2);
    const reused = bytes(7, 8);
    collector.push(reused);
    reused.fill(0);

    expect([...new Uint8Array(collector.toArrayBuffer())]).toEqual([7, 8]);
  });
});
