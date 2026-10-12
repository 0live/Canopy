import { EpsgSource, GeoFieldType, GeometryType, GeoWarningCode } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import type { ParseContext } from "@/features/data/services/geo-parsing/core/types";
import { geojsonParser } from "@/features/data/services/geo-parsing/formats/geojson/geojsonParser";
import { rejectionOf } from "@/features/data/__tests__/services/geo-parsing/helpers/errors";
import { memoryFile } from "@/features/data/__tests__/services/geo-parsing/helpers/files";
import { collection, feature, namedCrs, point } from "@/features/data/__tests__/services/geo-parsing/helpers/geojsonFixtures";

const ASSUMED_4326 = { code: GeoWarningCode.EPSG_ASSUMED, params: { epsg: "4326" } };
const LAMBERT_93_POINT = point(652_000, 6_862_000);

function context(signal = new AbortController().signal): ParseContext {
  return { signal, onProgress: vi.fn(), resolveEpsg: vi.fn() };
}

async function parseLayer(content: string | Uint8Array<ArrayBuffer>, path = "data/communes.geojson", ctx = context()) {
  const [layer] = await geojsonParser.parse(new Map([[path, memoryFile(content)]]), ctx);
  return layer;
}

const codeOf = async (content: string | Uint8Array<ArrayBuffer>) => (await rejectionOf(parseLayer(content))).code;

describe("geojsonParser.canParse", () => {
  it.each([
    ["a.geojson", true],
    ["dir/A.JSON", true],
    ["a.shp", false],
    ["geojson", false],
    ["geojson.d/data", false],
  ])("%s → %s", (path, expected) => {
    expect(geojsonParser.canParse(new Map([[path, memoryFile("")]]))).toBe(expected);
  });
});

describe("geojsonParser.parse", () => {
  it("reads a FeatureCollection without crs as assumed WGS84", async () => {
    const text = collection([feature(point(1.1, 49), { nom: "Évreux", pop: 47_000 })]);

    expect(await parseLayer(text)).toEqual({
      name: "communes",
      geometryType: GeometryType.POINT,
      epsg: "4326",
      epsgSource: EpsgSource.DEFAULT,
      fields: [
        { name: "nom", type: GeoFieldType.STRING, nativeType: null },
        { name: "pop", type: GeoFieldType.NUMBER, nativeType: null },
      ],
      featureCount: 1,
      encoding: "UTF-8",
      warnings: [ASSUMED_4326],
    });
  });

  it("uses a crs member declared after the features", async () => {
    const layer = await parseLayer(collection([feature(LAMBERT_93_POINT, { a: 1 })], namedCrs("urn:ogc:def:crs:EPSG::2154")));

    expect(layer).toMatchObject({ epsg: "2154", epsgSource: EpsgSource.DECLARED, warnings: [] });
  });

  it("treats a null crs member as absent", async () => {
    const layer = await parseLayer(collection([feature(point(1, 2), { a: 1 })], { crs: null }));

    expect(layer).toMatchObject({ epsg: "4326", warnings: [ASSUMED_4326] });
  });

  it("gives no EPSG for a crs member it cannot read", async () => {
    const layer = await parseLayer(collection([feature(point(1, 2), { a: 1 })], namedCrs("urn:ogc:def:crs:IGNF::LAMB93")));

    expect(layer).toMatchObject({ epsg: null, epsgSource: EpsgSource.NONE, warnings: [] });
  });

  it.each([
    ["no crs member", {}],
    ["a declared WGS84", namedCrs("urn:ogc:def:crs:OGC:1.3:CRS84")],
  ])("refuses projected coordinates with %s", async (_label, extra) => {
    const error = await rejectionOf(parseLayer(collection([feature(LAMBERT_93_POINT, { a: 1 })], extra)));

    expect(error).toMatchObject({ code: GeoParseErrorCode.COORDINATES_OUT_OF_RANGE, params: { epsg: "4326" } });
  });

  it("reads a single Feature as a one-feature layer", async () => {
    const layer = await parseLayer(JSON.stringify(feature(point(1, 2), { a: 1 })));

    expect(layer).toMatchObject({ featureCount: 1, geometryType: GeometryType.POINT, fields: [{ name: "a" }] });
  });

  it("reads a bare geometry as a one-feature layer without fields", async () => {
    const layer = await parseLayer(JSON.stringify(point(1, 2)));

    expect(layer).toMatchObject({ featureCount: 1, fields: [], warnings: [{ code: GeoWarningCode.NO_FIELDS }, ASSUMED_4326] });
  });

  it("reads a UTF-8 file with a BOM", async () => {
    expect((await parseLayer(`\uFEFF${collection([feature(point(1, 2), { a: 1 })])}`)).featureCount).toBe(1);
  });

  it("decodes multi-byte characters split across read chunks", async () => {
    const name = "é".repeat(40_000);
    const layer = await parseLayer(collection([feature(point(1, 2), { [name]: "Ç" })]));

    expect(layer.fields[0].name).toBe(name);
  });

  it("streams a file larger than one read chunk and reports progress", async () => {
    const features = Array.from({ length: 3000 }, (_, index) => feature(point(index / 100, 45), { index, label: "x" }));
    const text = collection(features);
    const ctx = context();

    const layer = await parseLayer(text, "big.json", ctx);

    expect(layer.featureCount).toBe(3000);
    expect(ctx.onProgress).toHaveBeenLastCalledWith(text.length, text.length);
    expect(vi.mocked(ctx.onProgress).mock.calls.length).toBeGreaterThan(1);
  });

  it.each([
    ["an empty collection", collection([]), GeoParseErrorCode.EMPTY],
    ["an empty file", "", GeoParseErrorCode.EMPTY],
    ["a truncated file", collection([feature(point(1, 2)), feature(point(3, 4))]).slice(0, -20), GeoParseErrorCode.CORRUPTED],
    ["a features member that is not an array", '{"type":"FeatureCollection","features":{}}', GeoParseErrorCode.CORRUPTED],
    ["an unknown geometry type", collection([feature({ type: "Circle", coordinates: [0, 0] })]), GeoParseErrorCode.CORRUPTED],
    ["a non-GeoJSON object", '{"name":"config"}', GeoParseErrorCode.UNSUPPORTED_FORMAT],
    ["a root array", JSON.stringify([feature(point(1, 2))]), GeoParseErrorCode.UNSUPPORTED_FORMAT],
    ["a Z coordinate", collection([feature(point(1, 2, 0))]), GeoParseErrorCode.UNSUPPORTED_DIMENSIONS],
  ])("refuses %s", async (_label, text, code) => {
    expect(await codeOf(text)).toBe(code);
  });

  it("refuses a feature that is not valid JSON, with its number", async () => {
    const text = `{"type":"FeatureCollection","features":[${JSON.stringify(feature(point(1, 2)))},{"type":"Feature"} {}]}`;

    expect(await rejectionOf(parseLayer(text))).toMatchObject({ code: GeoParseErrorCode.CORRUPTED, params: { feature: 2 } });
  });

  it("refuses a file that is not UTF-8", async () => {
    const latin1 = new TextEncoder().encode(collection([feature(point(1, 2), { nom: "Evreux" })]));
    latin1[latin1.indexOf("E".charCodeAt(0))] = 0xc9;

    expect(await codeOf(latin1)).toBe(GeoParseErrorCode.INVALID_ENCODING);
  });

  it("refuses several GeoJSON files", async () => {
    const files = new Map([["a.geojson", memoryFile("{}")], ["b.json", memoryFile("{}")]]);

    expect(await rejectionOf(geojsonParser.parse(files, context()))).toMatchObject({
      code: GeoParseErrorCode.MULTIPLE_LAYERS,
      params: { count: 2 },
    });
  });

  it("stops when aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(parseLayer(collection([]), "a.geojson", context(controller.signal))).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
