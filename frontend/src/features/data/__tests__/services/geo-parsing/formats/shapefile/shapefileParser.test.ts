import { EpsgSource, GeoFieldType, GeometryType, GeoWarningCode } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import type { ParseContext } from "@/features/data/services/geo-parsing/core/types";
import { shapefileParser } from "@/features/data/services/geo-parsing/formats/shapefile/shapefileParser";
import { ShpShapeType } from "@/features/data/services/geo-parsing/normalize/geometryTypes";
import { rejectionOf } from "@/features/data/__tests__/services/geo-parsing/helpers/errors";
import {
  dbfBytes,
  type ShapefileEntries,
  shpBytes,
  toFileSet,
  validShapefileEntries,
} from "@/features/data/__tests__/services/geo-parsing/helpers/shapefileFixtures";

const WGS84_WITH_AUTHORITY =
  'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],' +
  'PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433],AUTHORITY["EPSG","4326"]]';

function context(resolveEpsg: ParseContext["resolveEpsg"] = vi.fn().mockResolvedValue("4326")): ParseContext {
  return { signal: new AbortController().signal, onProgress: vi.fn(), resolveEpsg };
}

async function parseLayer(overrides: ShapefileEntries = {}, ctx = context()) {
  const [layer] = await shapefileParser.parse(toFileSet({ ...validShapefileEntries(), ...overrides }), ctx);
  return layer;
}

describe("shapefileParser.canParse", () => {
  it("accepts a set containing a .shp", () => {
    expect(shapefileParser.canParse(toFileSet({ "data/Roads.SHP": "" }))).toBe(true);
  });

  it("rejects a set without .shp", () => {
    expect(shapefileParser.canParse(toFileSet({ "roads.geojson": "", "roads.shp.xml": "" }))).toBe(false);
  });
});

describe("shapefileParser.parse", () => {
  it("reads the metadata of a GDAL-like dataset with an ESRI .prj", async () => {
    const resolveEpsg = vi.fn().mockResolvedValue("4326");

    expect(await parseLayer({}, context(resolveEpsg))).toEqual({
      name: "roads",
      geometryType: GeometryType.POINT,
      epsg: "4326",
      epsgSource: EpsgSource.DETECTED,
      fields: [
        { name: "NOM", type: GeoFieldType.STRING, nativeType: "C" },
        { name: "POP", type: GeoFieldType.NUMBER, nativeType: "N" },
      ],
      featureCount: 3,
      encoding: "ISO-8859-1",
      warnings: [],
    });
    expect(resolveEpsg).toHaveBeenCalledOnce();
  });

  it("uses the declared EPSG without calling the API", async () => {
    const resolveEpsg = vi.fn();

    const layer = await parseLayer({ "roads.prj": WGS84_WITH_AUTHORITY }, context(resolveEpsg));

    expect(layer).toMatchObject({ epsg: "4326", epsgSource: EpsgSource.DECLARED });
    expect(resolveEpsg).not.toHaveBeenCalled();
  });

  it("decodes field names with the .cpg encoding", async () => {
    const name = new TextEncoder().encode("RÉGION");
    const layer = await parseLayer({ "roads.dbf": dbfBytes({ fields: [{ name, type: "C" }] }), "roads.cpg": "UTF-8" });

    expect(layer).toMatchObject({ encoding: "UTF-8", fields: [{ name: "RÉGION" }] });
  });

  it("assumes ISO-8859-1 when no encoding is declared", async () => {
    const layer = await parseLayer({ "roads.dbf": dbfBytes({ fields: [{ name: "A", type: "C" }] }) });

    expect(layer.encoding).toBe("ISO-8859-1");
    expect(layer.warnings).toEqual([{ code: GeoWarningCode.ENCODING_ASSUMED, params: { encoding: "ISO-8859-1" } }]);
  });

  it("warns about a table without fields", async () => {
    const layer = await parseLayer({ "roads.dbf": dbfBytes({ languageDriverId: 87 }) });

    expect(layer).toMatchObject({ fields: [], warnings: [{ code: GeoWarningCode.NO_FIELDS }] });
  });

  it("reports a null shape type as an unknown geometry", async () => {
    const layer = await parseLayer({ "roads.shp": shpBytes({ shapeType: ShpShapeType.NULL }) });

    expect(layer.geometryType).toBe(GeometryType.UNKNOWN);
  });

  it("refuses Z geometries before any EPSG API call", async () => {
    const resolveEpsg = vi.fn();
    const overrides = { "roads.shp": shpBytes({ shapeType: ShpShapeType.POLYGON_Z }) };

    expect(await rejectionOf(parseLayer(overrides, context(resolveEpsg)))).toMatchObject({
      code: GeoParseErrorCode.UNSUPPORTED_DIMENSIONS,
    });
    expect(resolveEpsg).not.toHaveBeenCalled();
  });

  it("refuses a corrupted .shx", async () => {
    expect(await rejectionOf(parseLayer({ "roads.shx": "not a shx" }))).toMatchObject({
      code: GeoParseErrorCode.CORRUPTED,
      params: { component: "shx" },
    });
  });

  it.each([
    ["an empty .prj", { "roads.prj": "" }, "4326"],
    ["a CRS unknown to the API", {}, null],
  ])("returns no EPSG for %s", async (_label, overrides, apiAnswer) => {
    const layer = await parseLayer(overrides, context(vi.fn().mockResolvedValue(apiAnswer)));

    expect(layer).toMatchObject({ epsg: null, epsgSource: EpsgSource.NONE });
  });

  it("reports an unreachable EPSG API", async () => {
    const ctx = context(vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    expect((await rejectionOf(parseLayer({}, ctx))).code).toBe(GeoParseErrorCode.EPSG_SERVICE_UNAVAILABLE);
  });

  it("stops when aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(parseLayer({}, { ...context(), signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
