import { loadGeoImportLimits } from "@/features/data/services/geo-parsing/core/config";
import { ArchiveRejectReason, GeoFormat, GeometryType } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import type { ParseContext } from "@/features/data/services/geo-parsing/core/types";
import { extractGeoMetadata } from "@/features/data/services/geo-parsing/extract/extractGeoMetadata";
import { rejectionOf } from "@/features/data/__tests__/services/geo-parsing/helpers/errors";
import { collection, feature, point } from "@/features/data/__tests__/services/geo-parsing/helpers/geojsonFixtures";
import { gdalPointsEntries } from "@/features/data/__tests__/services/geo-parsing/helpers/gdalFixtures";
import { buildZip } from "@/features/data/__tests__/services/geo-parsing/helpers/zipFixtures";

const MIB = 1024 * 1024;
const DEFAULT_LIMITS = loadGeoImportLimits({});
const GEOJSON = collection([feature(point(1, 49), { nom: "Caen" })]);

function context(signal = new AbortController().signal): ParseContext {
  return { signal, onProgress: vi.fn(), resolveEpsg: vi.fn().mockResolvedValue("4326") };
}

const fileOf = (content: BlobPart, name: string) => new File([content], name);

describe("extractGeoMetadata", () => {
  it("reads a plain GeoJSON file and reports completion", async () => {
    const file = fileOf(GEOJSON, "communes.geojson");
    const ctx = context();

    const metadata = await extractGeoMetadata(file, ctx);

    expect(metadata).toMatchObject({ fileName: "communes.geojson", fileSize: file.size, format: GeoFormat.GEOJSON });
    expect(metadata.layers).toMatchObject([{ name: "communes", geometryType: GeometryType.POINT, featureCount: 1 }]);
    expect(metadata.parseTimeMs).toBeGreaterThanOrEqual(0);
    expect(ctx.onProgress).toHaveBeenLastCalledWith(file.size, file.size);
  });

  it("reads a zipped Shapefile and ignores the other files of the archive", async () => {
    const zip = await buildZip({ ...gdalPointsEntries(), "export/metadata.json": "{}", "export/readme.geojson": "{}" });

    const metadata = await extractGeoMetadata(fileOf(zip, "export.zip"), context());

    expect(metadata).toMatchObject({ format: GeoFormat.SHAPEFILE, layers: [{ name: "points_latin1", epsg: "4326" }] });
  });

  it.each([
    ["a ZIP holding only a GeoJSON", async () => fileOf(await buildZip({ "communes.geojson": GEOJSON }), "communes.zip")],
    ["an unsupported extension", async () => fileOf("<kml/>", "map.kml")],
    ["a file without extension", async () => fileOf(GEOJSON, "communes")],
  ])("refuses %s as unsupported", async (_label, makeFile) => {
    expect((await rejectionOf(extractGeoMetadata(await makeFile(), context()))).code).toBe(
      GeoParseErrorCode.UNSUPPORTED_FORMAT,
    );
  });

  it("refuses a file over the size limit before reading it", async () => {
    const limits = { ...DEFAULT_LIMITS, maxFileSizeBytes: MIB };
    const file = fileOf(new Uint8Array(MIB + 1), "big.geojson");

    expect(await rejectionOf(extractGeoMetadata(file, context(), limits))).toMatchObject({
      code: GeoParseErrorCode.TOO_LARGE,
      params: { maxSizeMb: 1 },
    });
  });

  it("applies the given limits to the archive", async () => {
    const limits = { ...DEFAULT_LIMITS, zipMaxEntries: 2 };
    const zip = await buildZip(gdalPointsEntries());

    expect(await rejectionOf(extractGeoMetadata(fileOf(zip, "export.zip"), context(), limits))).toMatchObject({
      code: GeoParseErrorCode.ARCHIVE_UNSAFE,
      params: { reason: ArchiveRejectReason.TOO_MANY_ENTRIES },
    });
  });

  it("refuses a .zip that is not an archive", async () => {
    expect((await rejectionOf(extractGeoMetadata(fileOf("not a zip", "export.zip"), context()))).code).toBe(
      GeoParseErrorCode.CORRUPTED,
    );
  });

  it("reports a cancellation as ABORTED", async () => {
    const controller = new AbortController();
    controller.abort();

    expect((await rejectionOf(extractGeoMetadata(fileOf(GEOJSON, "a.geojson"), context(controller.signal)))).code).toBe(
      GeoParseErrorCode.ABORTED,
    );
  });
});
