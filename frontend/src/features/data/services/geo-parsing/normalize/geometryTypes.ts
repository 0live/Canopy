import {
  ExtraDimension,
  GeometryType,
  GeoWarningCode,
} from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import type { GeoLayerWarning } from "@/features/data/services/geo-parsing/core/types";

export interface GeometryResolution {
  geometryType: GeometryType;
  warnings: GeoLayerWarning[];
}

/** Shape type codes of the ESRI Shapefile specification */
export const ShpShapeType = {
  NULL: 0,
  POINT: 1,
  POLYLINE: 3,
  POLYGON: 5,
  MULTIPOINT: 8,
  POINT_Z: 11,
  POLYLINE_Z: 13,
  POLYGON_Z: 15,
  MULTIPOINT_Z: 18,
  POINT_M: 21,
  POLYLINE_M: 23,
  POLYGON_M: 25,
  MULTIPOINT_M: 28,
  MULTIPATCH: 31,
} as const;

const SHP_2D_TYPES: Record<number, GeometryType> = {
  [ShpShapeType.NULL]: GeometryType.UNKNOWN,
  [ShpShapeType.POINT]: GeometryType.POINT,
  [ShpShapeType.POLYLINE]: GeometryType.LINESTRING,
  [ShpShapeType.POLYGON]: GeometryType.POLYGON,
  [ShpShapeType.MULTIPOINT]: GeometryType.MULTIPOINT,
};

/** Z shapes also carry M values; MultiPatch is a 3D surface */
const SHP_EXTRA_DIMENSIONS: Record<number, ExtraDimension> = {
  [ShpShapeType.POINT_Z]: ExtraDimension.ZM,
  [ShpShapeType.POLYLINE_Z]: ExtraDimension.ZM,
  [ShpShapeType.POLYGON_Z]: ExtraDimension.ZM,
  [ShpShapeType.MULTIPOINT_Z]: ExtraDimension.ZM,
  [ShpShapeType.POINT_M]: ExtraDimension.M,
  [ShpShapeType.POLYLINE_M]: ExtraDimension.M,
  [ShpShapeType.POLYGON_M]: ExtraDimension.M,
  [ShpShapeType.MULTIPOINT_M]: ExtraDimension.M,
  [ShpShapeType.MULTIPATCH]: ExtraDimension.ZM,
};

const GEOJSON_TYPES: Record<string, GeometryType> = {
  Point: GeometryType.POINT,
  LineString: GeometryType.LINESTRING,
  Polygon: GeometryType.POLYGON,
  MultiPoint: GeometryType.MULTIPOINT,
  MultiLineString: GeometryType.MULTILINESTRING,
  MultiPolygon: GeometryType.MULTIPOLYGON,
  // Business rule: layers must have a single geometry type, a collection counts as mixed
  GeometryCollection: GeometryType.MIXED,
};

const MULTI_OF: Partial<Record<GeometryType, GeometryType>> = {
  [GeometryType.POINT]: GeometryType.MULTIPOINT,
  [GeometryType.LINESTRING]: GeometryType.MULTILINESTRING,
  [GeometryType.POLYGON]: GeometryType.MULTIPOLYGON,
};

/** Only 2D shape types are accepted: Z, M and MultiPatch are refused */
export function fromShpShapeType(code: number): GeometryType {
  if (Object.hasOwn(SHP_2D_TYPES, code)) return SHP_2D_TYPES[code];
  if (Object.hasOwn(SHP_EXTRA_DIMENSIONS, code)) {
    throw new GeoParseError(GeoParseErrorCode.UNSUPPORTED_DIMENSIONS, {
      dimension: SHP_EXTRA_DIMENSIONS[code],
    });
  }
  throw new GeoParseError(GeoParseErrorCode.CORRUPTED, { shapeType: code });
}

export function fromGeoJsonType(type: string): GeometryType {
  return Object.hasOwn(GEOJSON_TYPES, type) ? GEOJSON_TYPES[type] : GeometryType.UNKNOWN;
}

/**
 * Reduces the geometry types seen in a layer to one column type:
 * X + Multi-X is promoted to Multi-X (with a warning), anything else heterogeneous is MIXED.
 */
export function mergeGeometryTypes(types: ReadonlySet<GeometryType>): GeometryResolution {
  if (types.size === 0) return { geometryType: GeometryType.UNKNOWN, warnings: [] };
  if (types.size === 1) return { geometryType: [...types][0], warnings: [] };
  const promoted = new Set([...types].map((type) => MULTI_OF[type] ?? type));
  if (promoted.size > 1) return { geometryType: GeometryType.MIXED, warnings: [] };
  const [geometryType] = promoted;
  return { geometryType, warnings: [{ code: GeoWarningCode.GEOMETRY_PROMOTED_TO_MULTI }] };
}
