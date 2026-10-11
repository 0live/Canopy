import {
  assertSafeArchive,
  isIgnoredEntryPath,
  type GuardedEntry,
} from "@/features/data/services/geo-parsing/archives/zipGuards";
import {
  ZIP_MAX_COMPRESSION_RATIO,
  ZIP_MAX_ENTRIES,
  ZIP_MAX_UNCOMPRESSED_BYTES,
} from "@/features/data/services/geo-parsing/core/constants";
import { ArchiveRejectReason } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";

const entry = (uncompressedSize: number, encrypted = false): GuardedEntry => ({
  uncompressedSize,
  encrypted,
});

function rejectReason(entries: GuardedEntry[], archiveBytes: number) {
  try {
    assertSafeArchive(entries, archiveBytes);
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
    ["too many entries", Array.from({ length: ZIP_MAX_ENTRIES + 1 }, () => entry(1)), 1e6, ArchiveRejectReason.TOO_MANY_ENTRIES],
    ["an encrypted entry", [entry(10), entry(10, true)], 100, ArchiveRejectReason.ENCRYPTED],
    ["too large once uncompressed", [entry(ZIP_MAX_UNCOMPRESSED_BYTES + 1)], ZIP_MAX_UNCOMPRESSED_BYTES, ArchiveRejectReason.TOO_LARGE_UNCOMPRESSED],
    ["a compression ratio above the limit", [entry(ZIP_MAX_COMPRESSION_RATIO * 1000 + 1)], 1000, ArchiveRejectReason.COMPRESSION_RATIO],
  ])("rejects %s", (_label, entries, archiveBytes, expected) => {
    expect(rejectReason(entries, archiveBytes)).toBe(expected);
  });

  it("accepts a ratio exactly at the limit", () => {
    expect(rejectReason([entry(ZIP_MAX_COMPRESSION_RATIO * 1000)], 1000)).toBeNull();
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
