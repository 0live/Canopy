import type { ReadableFile } from "@loaders.gl/loader-utils";
import type {
  EpsgSource,
  GeoFieldType,
  GeoFormat,
  GeometryType,
  GeoWarningCode,
} from "@/features/data/services/geo-parsing/core/enums";

/** Interpolation values for i18n messages (warnings and errors) */
export type GeoMessageParams = Record<string, string | number>;

export interface GeoField {
  name: string;
  type: GeoFieldType;
  /** Type as declared by the source format (e.g. DBF "N"), null when inferred */
  nativeType: string | null;
}

export interface GeoLayerWarning {
  code: GeoWarningCode;
  params?: GeoMessageParams;
}

export interface GeoLayerMetadata {
  name: string;
  geometryType: GeometryType;
  epsg: string | null;
  epsgSource: EpsgSource;
  fields: GeoField[];
  /** Null when the format does not expose it without a full scan */
  featureCount: number | null;
  /** Attribute encoding (.cpg / DBF language driver), null when unknown */
  encoding: string | null;
  warnings: GeoLayerWarning[];
}

export interface GeoFileMetadata {
  fileName: string;
  fileSize: number;
  format: GeoFormat;
  layers: GeoLayerMetadata[];
  parseTimeMs: number;
}

/**
 * Files available to a parser, keyed by path. A single file is a set of one
 * entry, an archive a set of N entries. Reads are ranged: nothing is loaded upfront.
 */
export type VirtualFileSet = ReadonlyMap<string, ReadableFile>;

export interface ParseContext {
  signal: AbortSignal;
  onProgress: (bytesRead: number, totalBytes: number) => void;
  /**
   * Resolves a WKT without authority code to an EPSG code (API fallback).
   * Returns null for an unknown CRS; rejects only when the API is unreachable.
   */
  resolveEpsg: (wkt: string) => Promise<string | null>;
}

/** Contract implemented by each geo format plugin */
export interface GeoFormatParser {
  readonly format: GeoFormat;
  /** Lower-case extensions without dot, e.g. ["geojson", "json"] */
  readonly extensions: readonly string[];
  canParse(files: VirtualFileSet): boolean;
  parse(files: VirtualFileSet, ctx: ParseContext): Promise<GeoLayerMetadata[]>;
}
