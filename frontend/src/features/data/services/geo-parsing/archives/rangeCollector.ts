/** Keeps the [start, end) slice of a byte stream delivered as successive chunks */
export class RangeCollector {
  private readonly start: number;
  private readonly end: number;
  private readonly parts: Uint8Array[] = [];
  private position = 0;
  private collected = 0;

  constructor(start: number, end: number) {
    this.start = start;
    this.end = end;
  }

  /** Returns true once the whole range has been received */
  push(chunk: Uint8Array): boolean {
    const chunkStart = this.position;
    this.position += chunk.length;
    const from = Math.max(this.start - chunkStart, 0);
    const to = Math.min(this.end - chunkStart, chunk.length);
    if (to > from) {
      // Copy: the producer may reuse its buffer for the next chunk
      this.parts.push(chunk.slice(from, to));
      this.collected += to - from;
    }
    return this.isComplete();
  }

  isComplete(): boolean {
    return this.position >= this.end;
  }

  toArrayBuffer(): ArrayBuffer {
    const out = new Uint8Array(this.collected);
    let offset = 0;
    for (const part of this.parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out.buffer;
  }
}
