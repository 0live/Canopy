import type { GeoMessageParams } from "@/features/data/services/geo-parsing/core/types";

/** Blocking parse failures, each mapped to an i18n message */
export const GeoParseErrorCode = {
  UNSUPPORTED_FORMAT: "unsupportedFormat",
  MISSING_COMPONENT: "missingComponent",
  CORRUPTED: "corrupted",
  TOO_LARGE: "tooLarge",
  ARCHIVE_UNSAFE: "archiveUnsafe",
  MULTIPLE_LAYERS: "multipleLayers",
  /** Z and/or M coordinates: only 2D data is accepted */
  UNSUPPORTED_DIMENSIONS: "unsupportedDimensions",
  /** The EPSG API could not be reached, distinct from an unknown CRS */
  EPSG_SERVICE_UNAVAILABLE: "epsgServiceUnavailable",
  /** Coordinates impossible in the layer CRS (e.g. projected metres read as WGS84 degrees) */
  COORDINATES_OUT_OF_RANGE: "coordinatesOutOfRange",
  /** Text that is not valid in its mandatory encoding (GeoJSON must be UTF-8) */
  INVALID_ENCODING: "invalidEncoding",
  EMPTY: "empty",
  ABORTED: "aborted",
} as const;

export type GeoParseErrorCode = (typeof GeoParseErrorCode)[keyof typeof GeoParseErrorCode];

const ABORT_ERROR_NAME = "AbortError";

export class GeoParseError extends Error {
  readonly code: GeoParseErrorCode;
  readonly params: GeoMessageParams;

  constructor(code: GeoParseErrorCode, params: GeoMessageParams = {}, options?: ErrorOptions) {
    // The code doubles as message: user-facing text comes from i18n, never from here
    super(code, options);
    this.name = "GeoParseError";
    this.code = code;
    this.params = params;
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === ABORT_ERROR_NAME
  );
}

/** Normalizes any thrown value so callers only ever deal with GeoParseError */
export function toGeoParseError(error: unknown): GeoParseError {
  if (error instanceof GeoParseError) return error;
  const code = isAbortError(error) ? GeoParseErrorCode.ABORTED : GeoParseErrorCode.CORRUPTED;
  return new GeoParseError(code, {}, { cause: error });
}
