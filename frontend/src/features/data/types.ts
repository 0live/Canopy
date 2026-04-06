export const DataLoadTab = {
  POSTGIS: "postgis",
  PMTILES: "pmtiles",
} as const;

export const DATA_LOAD_TABS = Object.values(DataLoadTab) as DataLoadTab[];

export type DataLoadTab = (typeof DataLoadTab)[keyof typeof DataLoadTab];

export const GeoFormat = {
  GEOJSON: "geojson",
  SHAPEFILE: "shapefile",
  UNKNOWN: "unknown",
} as const;

export type GeoFormat = (typeof GeoFormat)[keyof typeof GeoFormat];

export const GeoFieldType = {
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  DATE: "date",
  BINARY: "binary",
  UNKNOWN: "unknown",
} as const;

export type GeoFieldType = (typeof GeoFieldType)[keyof typeof GeoFieldType];

export interface GeoField {
  name: string;
  type: GeoFieldType;
}

export interface GeoLayerMetadata {
  name: string;
  geometryType: GeometryType;
  epsg: string | null;
  fields: GeoField[];
}

export interface GeoFileMetadata {
  fileName: string;
  fileSize: number;
  format: GeoFormat;
  layers: GeoLayerMetadata[];
  parseTimeMs: number;
}

export const MetadataParseStatus = {
  IDLE: "idle",
  PARSING: "parsing",
  SUCCESS: "success",
  ERROR: "error",
} as const;

export type MetadataParseStatus = (typeof MetadataParseStatus)[keyof typeof MetadataParseStatus];

export const GeometryType = {
  POINT: "Point",
  LINESTRING: "LineString",
  POLYGON: "Polygon",
  MULTIPOINT: "MultiPoint",
  MULTILINESTRING: "MultiLineString",
  MULTIPOLYGON: "MultiPolygon",
  UNKNOWN: "Unknown",
} as const;

export type GeometryType = (typeof GeometryType)[keyof typeof GeometryType];

// SHP geometry type codes (ESRI spec)
export const SHP_GEOMETRY_TYPES: Record<number, GeometryType> = {
  0: "Unknown", 1: "Point", 3: "LineString", 5: "Polygon", 8: "MultiPoint"
};

export const EXTENSION_TO_FORMAT: Record<string, GeoFormat> = {
  geojson: GeoFormat.GEOJSON, json: GeoFormat.GEOJSON,
  zip: GeoFormat.SHAPEFILE,
};
