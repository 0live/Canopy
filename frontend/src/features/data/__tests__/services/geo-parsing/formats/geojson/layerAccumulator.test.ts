import { GeoFieldType, GeometryType, GeoWarningCode } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import { GeoJsonLayerAccumulator } from "@/features/data/services/geo-parsing/formats/geojson/layerAccumulator";
import { thrownBy } from "@/features/data/__tests__/services/geo-parsing/helpers/errors";
import { feature, point, polygon } from "@/features/data/__tests__/services/geo-parsing/helpers/geojsonFixtures";

function summarize(...features: unknown[]) {
  const layer = new GeoJsonLayerAccumulator();
  features.forEach((item) => layer.add(item));
  return layer.summarize();
}

const SQUARE = polygon([0, 0], [1, 0], [1, 1], [0, 0]);

describe("GeoJsonLayerAccumulator", () => {
  it("merges field types across features, in order of first appearance", () => {
    const summary = summarize(
      feature(point(0, 0), { id: 1, name: null, created: "2024-01-02" }),
      feature(point(1, 1), { id: 2, name: "Caen", extra: { nested: true } }),
    );

    expect(summary.fields).toEqual([
      { name: "id", type: GeoFieldType.NUMBER, nativeType: null },
      { name: "name", type: GeoFieldType.STRING, nativeType: null },
      { name: "created", type: GeoFieldType.DATE, nativeType: null },
      { name: "extra", type: GeoFieldType.STRING, nativeType: null },
    ]);
    expect(summary).toMatchObject({ featureCount: 2, geometryType: GeometryType.POINT, warnings: [] });
  });

  it("keeps a field that is always empty as unknown", () => {
    expect(summarize(feature(point(0, 0), { comment: "" })).fields[0].type).toBe(GeoFieldType.UNKNOWN);
  });

  it("falls back to text and warns about fields with mixed types", () => {
    const summary = summarize(
      feature(point(0, 0), { code: 75, ok: true, label: "a" }),
      feature(point(0, 0), { code: "2A", ok: 1, label: "b" }),
    );

    expect(summary.fields.map(({ type }) => type)).toEqual([GeoFieldType.STRING, GeoFieldType.STRING, GeoFieldType.STRING]);
    expect(summary.warnings).toEqual([{ code: GeoWarningCode.MIXED_FIELD_TYPES, params: { fields: "code, ok" } }]);
  });

  it("promotes Polygon + MultiPolygon to MultiPolygon with a warning", () => {
    const multi = { type: "MultiPolygon", coordinates: [SQUARE.coordinates] };

    expect(summarize(feature(SQUARE, { a: 1 }), feature(multi, { a: 2 }))).toMatchObject({
      geometryType: GeometryType.MULTIPOLYGON,
      warnings: [{ code: GeoWarningCode.GEOMETRY_PROMOTED_TO_MULTI }],
    });
  });

  it("reports mixed geometry types", () => {
    expect(summarize(feature(point(0, 0), { a: 1 }), feature(SQUARE, { a: 1 })).geometryType).toBe(GeometryType.MIXED);
  });

  it("counts null geometries in a warning", () => {
    const summary = summarize(feature(point(0, 0), { a: 1 }), feature(null, { a: 2 }), feature(null, { a: 3 }));

    expect(summary).toMatchObject({ geometryType: GeometryType.POINT, featureCount: 3 });
    expect(summary.warnings).toEqual([{ code: GeoWarningCode.NULL_GEOMETRIES, params: { count: 2 } }]);
  });

  it("reports an unknown geometry when every geometry is null", () => {
    expect(summarize(feature(null, { a: 1 })).geometryType).toBe(GeometryType.UNKNOWN);
  });

  it("warns about a layer without fields", () => {
    expect(summarize(feature(point(0, 0), null), feature(point(1, 1), {})).warnings).toEqual([
      { code: GeoWarningCode.NO_FIELDS },
    ]);
  });

  it.each([
    ["a non-object feature", [1, 2]],
    ["a wrong feature type", { type: "Point", coordinates: [0, 0] }],
    ["array properties", feature(point(0, 0), [1] as unknown as Record<string, unknown>)],
  ])("refuses %s with its number", (_label, invalid) => {
    expect(thrownBy(() => summarize(feature(point(0, 0)), invalid))).toMatchObject({
      code: GeoParseErrorCode.CORRUPTED,
      params: { feature: 2 },
    });
  });
});
