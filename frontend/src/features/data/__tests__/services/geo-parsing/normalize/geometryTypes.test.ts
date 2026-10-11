import {
  ExtraDimension,
  GeometryType,
  GeoWarningCode,
} from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import {
  fromGeoJsonType,
  fromShpShapeType,
  mergeGeometryTypes,
  ShpShapeType,
} from "@/features/data/services/geo-parsing/normalize/geometryTypes";

const PROMOTED = [{ code: GeoWarningCode.GEOMETRY_PROMOTED_TO_MULTI }];

function thrownBy(fn: () => unknown): GeoParseError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(GeoParseError);
    return error as GeoParseError;
  }
  throw new Error("expected a GeoParseError");
}

describe("fromShpShapeType", () => {
  it.each([
    [ShpShapeType.NULL, GeometryType.UNKNOWN],
    [ShpShapeType.POINT, GeometryType.POINT],
    [ShpShapeType.POLYLINE, GeometryType.LINESTRING],
    [ShpShapeType.POLYGON, GeometryType.POLYGON],
    [ShpShapeType.MULTIPOINT, GeometryType.MULTIPOINT],
  ])("maps 2D code %i to %s", (code, expected) => {
    expect(fromShpShapeType(code)).toBe(expected);
  });

  it.each([
    [ShpShapeType.POINT_Z, ExtraDimension.ZM],
    [ShpShapeType.POLYLINE_Z, ExtraDimension.ZM],
    [ShpShapeType.POLYGON_Z, ExtraDimension.ZM],
    [ShpShapeType.MULTIPOINT_Z, ExtraDimension.ZM],
    [ShpShapeType.MULTIPATCH, ExtraDimension.ZM],
    [ShpShapeType.POINT_M, ExtraDimension.M],
    [ShpShapeType.POLYLINE_M, ExtraDimension.M],
    [ShpShapeType.POLYGON_M, ExtraDimension.M],
    [ShpShapeType.MULTIPOINT_M, ExtraDimension.M],
  ])("refuses code %i (%s dimensions)", (code, dimension) => {
    expect(thrownBy(() => fromShpShapeType(code))).toMatchObject({
      code: GeoParseErrorCode.UNSUPPORTED_DIMENSIONS,
      params: { dimension },
    });
  });

  it.each([2, 7, 99, -1])("treats undefined code %i as CORRUPTED", (code) => {
    expect(thrownBy(() => fromShpShapeType(code))).toMatchObject({
      code: GeoParseErrorCode.CORRUPTED,
      params: { shapeType: code },
    });
  });
});

describe("fromGeoJsonType", () => {
  it.each([
    ["Point", GeometryType.POINT],
    ["LineString", GeometryType.LINESTRING],
    ["Polygon", GeometryType.POLYGON],
    ["MultiPoint", GeometryType.MULTIPOINT],
    ["MultiLineString", GeometryType.MULTILINESTRING],
    ["MultiPolygon", GeometryType.MULTIPOLYGON],
    ["GeometryCollection", GeometryType.MIXED],
    ["point", GeometryType.UNKNOWN],
    ["Circle", GeometryType.UNKNOWN],
    ["constructor", GeometryType.UNKNOWN],
  ])("%s → %s", (type, expected) => {
    expect(fromGeoJsonType(type)).toBe(expected);
  });
});

describe("mergeGeometryTypes", () => {
  const { POINT, MULTIPOINT, POLYGON, MULTIPOLYGON, LINESTRING, MULTILINESTRING, MIXED, UNKNOWN } = GeometryType;

  it.each([
    ["nothing", [], UNKNOWN, []],
    ["a single type", [POLYGON], POLYGON, []],
    ["a single multi type", [MULTIPOLYGON], MULTIPOLYGON, []],
    ["Polygon + MultiPolygon", [POLYGON, MULTIPOLYGON], MULTIPOLYGON, PROMOTED],
    ["Point + MultiPoint", [POINT, MULTIPOINT], MULTIPOINT, PROMOTED],
    ["LineString + MultiLineString", [LINESTRING, MULTILINESTRING], MULTILINESTRING, PROMOTED],
    ["Point + Polygon", [POINT, POLYGON], MIXED, []],
    ["Point + MultiPolygon", [POINT, MULTIPOLYGON], MIXED, []],
    ["a collection with Point", [MIXED, POINT], MIXED, []],
  ])("merges %s", (_label, types, expected, warnings) => {
    expect(mergeGeometryTypes(new Set(types))).toEqual({ geometryType: expected, warnings });
  });
});
