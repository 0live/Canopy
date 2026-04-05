export const DataLoadTab = {
  POSTGIS: "postgis",
  PMTILES: "pmtiles",
} as const;

export const DATA_LOAD_TABS = Object.values(DataLoadTab) as DataLoadTab[];

export type DataLoadTab = (typeof DataLoadTab)[keyof typeof DataLoadTab];

export const GeoFormat = {
  GEOJSON: "geojson",
  FLATGEOBUF: "flatgeobuf",
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
  geometryType: string;
  featureCount: number | null;
  epsg: string | null;
  bbox: [number, number, number, number] | null;
  fields: GeoField[];
}

export interface GeoFileMetadata {
  fileName: string;
  fileSize: number;
  format: GeoFormat;
  layers: GeoLayerMetadata[];
  parseTimeMs: number;
}

export type MetadataParseStatus = "idle" | "parsing" | "success" | "error";

// FlatGeobuf geometry type enum (numeric string → name)
export const FGB_GEOMETRY_TYPES: Record<string, string> = {
  "0": "Unknown", "1": "Point", "2": "LineString", "3": "Polygon",
  "4": "MultiPoint", "5": "MultiLineString", "6": "MultiPolygon", "7": "GeometryCollection",
};

// SHP geometry type codes (ESRI spec)
export const SHP_GEOMETRY_TYPES: Record<number, string> = {
  0: "Null", 1: "Point", 3: "LineString", 5: "Polygon", 8: "MultiPoint",
  11: "PointZ", 13: "LineStringZ", 15: "PolygonZ", 18: "MultiPointZ",
  21: "PointM", 23: "LineStringM", 25: "PolygonM", 28: "MultiPointM", 31: "MultiPatch",
};

export const EXTENSION_TO_FORMAT: Record<string, GeoFormat> = {
  geojson: GeoFormat.GEOJSON, json: GeoFormat.GEOJSON,
  fgb: GeoFormat.FLATGEOBUF, zip: GeoFormat.SHAPEFILE,
};
