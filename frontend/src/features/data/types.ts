import {
  GeoFieldType,
  GeoFormat,
  GeometryType,
} from "@/features/data/services/geo-parsing/core/enums";

// Parsing enums and metadata shapes live in the geo-parsing core; re-exported for UI consumers
export { GeoFieldType, GeoFormat, GeometryType };
export type {
  GeoField,
  GeoFileMetadata,
  GeoLayerMetadata,
  GeoLayerWarning,
} from "@/features/data/services/geo-parsing/core/types";

export const DataLoadTab = {
  GEO_FILES: "geoFiles",
  TABULAR_FILES: "tabularFiles",
  CLOUD_SOURCE: "cloudSource",
} as const;

export const DATA_LOAD_TABS = Object.values(DataLoadTab) as DataLoadTab[];

export type DataLoadTab = (typeof DataLoadTab)[keyof typeof DataLoadTab];

export const MetadataParseStatus = {
  IDLE: "idle",
  PARSING: "parsing",
  SUCCESS: "success",
  ERROR: "error",
} as const;

export type MetadataParseStatus = (typeof MetadataParseStatus)[keyof typeof MetadataParseStatus];

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
  FEATURE_COUNT: "featureCount",
  ENCODING: "encoding",
} as const;

export type GeoMetadataField = (typeof GeoMetadataField)[keyof typeof GeoMetadataField];

/** Maps each errored metadata field to its i18n error key */
export type GeoMetadataErrors = Partial<Record<GeoMetadataField, string>>;
