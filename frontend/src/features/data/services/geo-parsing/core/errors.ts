import type { GeoMessageParams } from "@/features/data/services/geo-parsing/core/types";

/** Blocking parse failures, each mapped to an i18n message */
export const GeoParseErrorCode = {
  UNSUPPORTED_FORMAT: "unsupportedFormat",
  MISSING_COMPONENT: "missingComponent",
  CORRUPTED: "corrupted",
  TOO_LARGE: "tooLarge",
  ARCHIVE_UNSAFE: "archiveUnsafe",
  MULTIPLE_LAYERS: "multipleLayers",
  MIXED_GEOMETRY_TYPES: "mixedGeometryTypes",
  MULTIPATCH_UNSUPPORTED: "multipatchUnsupported",
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
