import type { ReadableFile } from "@loaders.gl/loader-utils";
import type { FileEntry } from "@zip.js/zip.js";
import { RangeCollector } from "@/features/data/services/geo-parsing/archives/rangeCollector";

/**
 * Decompresses an entry as a stream and stops as soon as [start, end) is received.
 * Cost grows with `end`, not with the entry size: reading a header is cheap,
 * reading near the end of a large compressed entry is not.
 */
async function readEntryRange(
  entry: FileEntry,
  start: number,
  end: number,
  signal: AbortSignal,
): Promise<ArrayBuffer> {
  const collector = new RangeCollector(start, end);
  const stop = new AbortController();
  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      if (collector.push(chunk)) stop.abort();
    },
  });
  try {
    await entry.getData(writable, { signal: AbortSignal.any([stop.signal, signal]) });
  } catch (error) {
    // Our own early stop is expected; a caller abort or a real failure is not
    if (signal.aborted || !stop.signal.aborted) throw error;
  }
  return collector.toArrayBuffer();
}

/** ReadableFile view of a ZIP entry, so parsers handle archived and plain files alike */
export class ZipEntryFile implements ReadableFile {
  readonly handle: FileEntry;
  readonly size: number;
  readonly bigsize: bigint;
  readonly url: string;
  private readonly signal: AbortSignal;

  constructor(entry: FileEntry, signal: AbortSignal) {
    this.handle = entry;
    this.size = entry.uncompressedSize;
    this.bigsize = BigInt(entry.uncompressedSize);
    this.url = entry.filename;
    this.signal = signal;
  }

  async read(start: number | bigint = 0, length?: number): Promise<ArrayBuffer> {
    const from = Number(start);
    const to = Math.min(this.size, from + (length ?? this.size - from));
    if (to <= from) return new ArrayBuffer(0);
    return readEntryRange(this.handle, from, to, this.signal);
  }

  async close(): Promise<void> {}
}
