import {
  GeoFieldType,
  GeoFormat,
  GeometryType,
} from "@/features/data/services/geo-parsing/core/enums";

// Parsing enums live in the geo-parsing core; re-exported for existing consumers
export { GeoFieldType, GeoFormat, GeometryType };

export const DataLoadTab = {
  GEO_FILES: "geoFiles",
  TABULAR_FILES: "tabularFiles",
  CLOUD_SOURCE: "cloudSource",
} as const;

export const DATA_LOAD_TABS = Object.values(DataLoadTab) as DataLoadTab[];

export type DataLoadTab = (typeof DataLoadTab)[keyof typeof DataLoadTab];

// Legacy metadata shapes used by the current UI; replaced by geo-parsing/core/types
// when the UI is switched to the new parser (phase 8)
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

// SHP geometry type codes (ESRI spec)
export const SHP_GEOMETRY_TYPES: Record<number, GeometryType> = {
  0: "Unknown", 1: "Point", 3: "LineString", 5: "Polygon", 8: "MultiPoint"
};

export const EXTENSION_TO_FORMAT: Record<string, GeoFormat> = {
  geojson: GeoFormat.GEOJSON, json: GeoFormat.GEOJSON,
  zip: GeoFormat.SHAPEFILE,
};

export interface GeoFieldImportSettings {
  include: boolean;
  index: boolean;
}

export interface GeoImportFormData {
  layerName: string;
  fieldSettings: Record<string, GeoFieldImportSettings>;
}

export const ExportTarget = {
  POSTGIS: "postgis",
  PMTILES: "pmtiles",
} as const;

export type ExportTarget = (typeof ExportTarget)[keyof typeof ExportTarget];

export const GeoMetadataField = {
  FILE_NAME: "fileName",
  FILE_TYPE: "fileType",
  FILE_SIZE: "fileSize",
  GEOMETRY_TYPE: "geometryType",
  EPSG: "epsg",
  FIELDS: "fields",
} as const;

export type GeoMetadataField = (typeof GeoMetadataField)[keyof typeof GeoMetadataField];

/** Maps each errored metadata field to its i18n error key */
export type GeoMetadataErrors = Partial<Record<GeoMetadataField, string>>;
