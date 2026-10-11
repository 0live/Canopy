import {
  assertSafeArchive,
  isIgnoredEntryPath,
  type GuardedEntry,
} from "@/features/data/services/geo-parsing/archives/zipGuards";
import type { GeoImportLimits } from "@/features/data/services/geo-parsing/core/config";
import { ArchiveRejectReason } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";

const entry = (uncompressedSize: number, encrypted = false): GuardedEntry => ({
  uncompressedSize,
  encrypted,
});

const LIMITS: GeoImportLimits = {
  maxFileSizeBytes: 1_000_000,
  zipMaxEntries: 5,
  zipMaxCompressionRatio: 10,
  zipMaxUncompressedBytes: 50_000,
};

function rejectReason(entries: GuardedEntry[], archiveBytes: number) {
  try {
    assertSafeArchive(entries, archiveBytes, LIMITS);
    return null;
  } catch (error) {
    expect(error).toBeInstanceOf(GeoParseError);
    expect((error as GeoParseError).code).toBe(GeoParseErrorCode.ARCHIVE_UNSAFE);
    return (error as GeoParseError).params.reason;
  }
}

describe("assertSafeArchive", () => {
  it("accepts a regular archive", () => {
    expect(rejectReason([entry(1000), entry(500)], 600)).toBeNull();
  });

  it.each([
    ["too many entries", Array.from({ length: 6 }, () => entry(1)), 1000, ArchiveRejectReason.TOO_MANY_ENTRIES],
    ["an encrypted entry", [entry(10), entry(10, true)], 100, ArchiveRejectReason.ENCRYPTED],
    ["too large once uncompressed", [entry(50_001)], 50_000, ArchiveRejectReason.TOO_LARGE_UNCOMPRESSED],
    ["a compression ratio above the limit", [entry(10_001)], 1000, ArchiveRejectReason.COMPRESSION_RATIO],
  ])("rejects %s", (_label, entries, archiveBytes, expected) => {
    expect(rejectReason(entries, archiveBytes)).toBe(expected);
  });

  it("accepts a ratio exactly at the limit", () => {
    expect(rejectReason([entry(10_000)], 1000)).toBeNull();
  });
});

describe("isIgnoredEntryPath", () => {
  it.each([
    ["__MACOSX/._roads.shp", true],
    ["data/._roads.dbf", true],
    [".DS_Store", true],
    ["data/.DS_Store", true],
    ["roads.shp", false],
    ["data/roads.dbf", false],
    ["my__MACOSX/roads.shp", false],
  ])("%s → %s", (path, expected) => {
    expect(isIgnoredEntryPath(path)).toBe(expected);
  });
});
