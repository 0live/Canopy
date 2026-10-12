import { ExtraDimension, GeometryType } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import { fromGeoJsonType } from "@/features/data/services/geo-parsing/normalize/geometryTypes";

export interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/** Running bounding box of all scanned positions */
export class Extent {
  minX = Infinity;
  maxX = -Infinity;
  minY = Infinity;
  maxY = -Infinity;

  add(x: number, y: number): void {
    this.minX = Math.min(this.minX, x);
    this.maxX = Math.max(this.maxX, x);
    this.minY = Math.min(this.minY, y);
    this.maxY = Math.max(this.maxY, y);
  }

  /** An empty extent (no position at all) is within any bounds */
  isWithin(bounds: Bounds): boolean {
    if (this.minX > this.maxX) return true;
    return this.minX >= bounds.minX && this.maxX <= bounds.maxX && this.minY >= bounds.minY && this.maxY <= bounds.maxY;
  }
}

/** Array nesting above positions, per RFC 7946 geometry type */
const POSITION_DEPTH: Readonly<Partial<Record<GeometryType, number>>> = {
  [GeometryType.POINT]: 0,
  [GeometryType.LINESTRING]: 1,
  [GeometryType.MULTIPOINT]: 1,
  [GeometryType.POLYGON]: 2,
  [GeometryType.MULTILINESTRING]: 2,
  [GeometryType.MULTIPOLYGON]: 3,
};
const XY_LENGTH = 2;
const XYZ_LENGTH = 3;

const malformed = (feature: number) => new GeoParseError(GeoParseErrorCode.CORRUPTED, { feature });

function scanPosition(position: unknown, feature: number, extent: Extent): void {
  if (!Array.isArray(position) || position.length < XY_LENGTH) throw malformed(feature);
  if (!position.every((value) => typeof value === "number" && Number.isFinite(value))) throw malformed(feature);
  if (position.length > XY_LENGTH) {
    const dimension = position.length === XYZ_LENGTH ? ExtraDimension.Z : ExtraDimension.ZM;
    throw new GeoParseError(GeoParseErrorCode.UNSUPPORTED_DIMENSIONS, { dimension, feature });
  }
  extent.add(position[0], position[1]);
}

/** Empty arrays above positions are valid: RFC 7946 allows empty geometries */
function scanCoordinates(coordinates: unknown, depth: number, feature: number, extent: Extent): void {
  if (depth === 0) return scanPosition(coordinates, feature, extent);
  if (!Array.isArray(coordinates)) throw malformed(feature);
  for (const child of coordinates) scanCoordinates(child, depth - 1, feature, extent);
}

/**
 * Validates one geometry and returns its type, null for a null geometry.
 * A GeometryCollection is reported as MIXED (refused) without scanning its members.
 * @param feature 1-based feature number, for error messages
 */
export function scanGeometry(geometry: unknown, feature: number, extent: Extent): GeometryType | null {
  if (geometry === null || geometry === undefined) return null;
  if (typeof geometry !== "object" || Array.isArray(geometry)) throw malformed(feature);
  const { type, coordinates } = geometry as { type?: unknown; coordinates?: unknown };
  const geometryType = fromGeoJsonType(String(type));
  if (geometryType === GeometryType.MIXED) return geometryType;
  const depth = POSITION_DEPTH[geometryType];
  if (depth === undefined) throw malformed(feature);
  scanCoordinates(coordinates, depth, feature, extent);
  return geometryType;
}
