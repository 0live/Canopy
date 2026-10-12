import type { ParseContext } from "@/features/data/services/geo-parsing/core/types";

type ProgressCallback = ParseContext["onProgress"];

/**
 * Drops progress reports closer than `intervalMs` to the previous one: a 2 GiB
 * file read in 64 KiB chunks would otherwise post ~32k messages.
 * The first and the final (complete) reports always go through.
 */
export function throttleProgress(
  onProgress: ProgressCallback,
  intervalMs: number,
  now: () => number = () => performance.now(),
): ProgressCallback {
  let last = -Infinity;
  return (bytesRead, totalBytes) => {
    const time = now();
    if (bytesRead < totalBytes && time - last < intervalMs) return;
    last = time;
    onProgress(bytesRead, totalBytes);
  };
}
