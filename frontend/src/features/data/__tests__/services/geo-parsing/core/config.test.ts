import { GeoImportEnvVar, loadGeoImportLimits } from "@/features/data/services/geo-parsing/core/config";

const MIB = 1024 * 1024;
const DEFAULT_LIMITS = {
  maxFileSizeBytes: 2048 * MIB,
  zipMaxEntries: 1000,
  zipMaxCompressionRatio: 200,
  zipMaxUncompressedBytes: 8192 * MIB,
};

describe("loadGeoImportLimits", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("uses the defaults when nothing is configured", () => {
    expect(loadGeoImportLimits({})).toEqual(DEFAULT_LIMITS);
  });

  it("reads configured values, sizes being in MiB", () => {
    const limits = loadGeoImportLimits({
      [GeoImportEnvVar.MAX_FILE_SIZE_MB]: "100",
      [GeoImportEnvVar.ZIP_MAX_ENTRIES]: "50",
      [GeoImportEnvVar.ZIP_MAX_COMPRESSION_RATIO]: "20",
      [GeoImportEnvVar.ZIP_MAX_UNCOMPRESSED_MB]: "500",
    });

    expect(limits).toEqual({
      maxFileSizeBytes: 100 * MIB,
      zipMaxEntries: 50,
      zipMaxCompressionRatio: 20,
      zipMaxUncompressedBytes: 500 * MIB,
    });
  });

  it("treats an empty value as unset", () => {
    expect(loadGeoImportLimits({ [GeoImportEnvVar.ZIP_MAX_ENTRIES]: "" }).zipMaxEntries).toBe(1000);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it.each(["abc", "0", "-5", "Infinity"])("falls back to the default and warns for %s", (raw) => {
    const limits = loadGeoImportLimits({ [GeoImportEnvVar.ZIP_MAX_ENTRIES]: raw });

    expect(limits.zipMaxEntries).toBe(1000);
    expect(console.warn).toHaveBeenCalledOnce();
  });
});
