import type { EntryMetaData } from "@zip.js/zip.js";
import { GEO_IMPORT_LIMITS, type GeoImportLimits } from "@/features/data/services/geo-parsing/core/config";
import { ZIP_IGNORED_PATH_PATTERNS } from "@/features/data/services/geo-parsing/core/constants";
import { ArchiveRejectReason } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";

export type GuardedEntry = Pick<EntryMetaData, "uncompressedSize" | "encrypted">;

function findRejectReason(
  entries: readonly GuardedEntry[],
  archiveBytes: number,
  limits: GeoImportLimits,
): ArchiveRejectReason | null {
  if (entries.length > limits.zipMaxEntries) return ArchiveRejectReason.TOO_MANY_ENTRIES;
  if (entries.some((entry) => entry.encrypted)) return ArchiveRejectReason.ENCRYPTED;
  const uncompressed = entries.reduce((sum, entry) => sum + entry.uncompressedSize, 0);
  if (uncompressed > limits.zipMaxUncompressedBytes) return ArchiveRejectReason.TOO_LARGE_UNCOMPRESSED;
  // Archive size rather than declared compressed sizes: both come from the same untrusted directory
  if (uncompressed > archiveBytes * limits.zipMaxCompressionRatio) return ArchiveRejectReason.COMPRESSION_RATIO;
  return null;
}

/** Refuses zip bombs and encrypted archives using the central directory only */
export function assertSafeArchive(
  entries: readonly GuardedEntry[],
  archiveBytes: number,
  limits: GeoImportLimits = GEO_IMPORT_LIMITS,
): void {
  const reason = findRejectReason(entries, archiveBytes, limits);
  if (reason) throw new GeoParseError(GeoParseErrorCode.ARCHIVE_UNSAFE, { reason });
}

/** OS metadata (macOS resource forks, Finder files) is not part of the dataset */
export function isIgnoredEntryPath(path: string): boolean {
  return ZIP_IGNORED_PATH_PATTERNS.some((pattern) => pattern.test(path));
}
