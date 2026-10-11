import { BlobFile, type ReadableFile } from "@loaders.gl/loader-utils";

export function memoryFile(bytes: Uint8Array<ArrayBuffer> | string): ReadableFile {
  const data = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  return new BlobFile(new Blob([data]));
}

/** Deterministic incompressible bytes (LCG), so stored and deflated sizes stay comparable */
export function noiseBytes(length: number, seed = 1): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(length);
  let state = seed;
  for (let i = 0; i < length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    out[i] = state >>> 24;
  }
  return out;
}

export interface SpyFile extends ReadableFile {
  readonly bytesRead: number;
}

/** Wraps a ReadableFile and counts the bytes actually read, to prove bounded reads */
export function spyFile(inner: ReadableFile): SpyFile {
  let bytesRead = 0;
  return {
    handle: inner.handle,
    size: inner.size,
    bigsize: inner.bigsize,
    url: inner.url,
    get bytesRead() {
      return bytesRead;
    },
    async read(start, length) {
      const buffer = await inner.read(start, length);
      bytesRead += buffer.byteLength;
      return buffer;
    },
    close: () => inner.close(),
  };
}
