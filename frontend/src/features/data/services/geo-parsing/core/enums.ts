export const GeoFormat = {
  GEOJSON: "geojson",
  SHAPEFILE: "shapefile",
  UNKNOWN: "unknown",
} as const;

export type GeoFormat = (typeof GeoFormat)[keyof typeof GeoFormat];

export const GeometryType = {
  POINT: "Point",
  LINESTRING: "LineString",
  POLYGON: "Polygon",
  MULTIPOINT: "MultiPoint",
  MULTILINESTRING: "MultiLineString",
  MULTIPOLYGON: "MultiPolygon",
  /** Several incompatible geometry types: blocking, a PostGIS column holds one type */
  MIXED: "Mixed",
  UNKNOWN: "Unknown",
} as const;

export type GeometryType = (typeof GeometryType)[keyof typeof GeometryType];

export const GeoFieldType = {
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  DATE: "date",
  BINARY: "binary",
  UNKNOWN: "unknown",
} as const;

export type GeoFieldType = (typeof GeoFieldType)[keyof typeof GeoFieldType];

/** Where the layer EPSG code comes from */
export const EpsgSource = {
  /** Explicit authority code in the file (.prj AUTHORITY/ID, GeoJSON crs member) */
  DECLARED: "declared",
  /** Resolved by the API from a WKT without authority code (e.g. ESRI .prj) */
  DETECTED: "detected",
  /** Format default (RFC 7946: GeoJSON is WGS84) */
  DEFAULT: "default",
  NONE: "none",
} as const;

export type EpsgSource = (typeof EpsgSource)[keyof typeof EpsgSource];

/** Non-blocking findings shown to the user before import */
export const GeoWarningCode = {
  GEOMETRY_PROMOTED_TO_MULTI: "geometryPromotedToMulti",
  Z_M_DROPPED: "zmDropped",
  MIXED_FIELD_TYPES: "mixedFieldTypes",
  NULL_GEOMETRIES: "nullGeometries",
  MISSING_SHX: "missingShx",
  EPSG_ASSUMED: "epsgAssumed",
} as const;

export type GeoWarningCode = (typeof GeoWarningCode)[keyof typeof GeoWarningCode];

/** Why an archive is refused before reading it (param of ARCHIVE_UNSAFE) */
export const ArchiveRejectReason = {
  TOO_MANY_ENTRIES: "tooManyEntries",
  TOO_LARGE_UNCOMPRESSED: "tooLargeUncompressed",
  COMPRESSION_RATIO: "compressionRatio",
  ENCRYPTED: "encrypted",
} as const;

export type ArchiveRejectReason = (typeof ArchiveRejectReason)[keyof typeof ArchiveRejectReason];
