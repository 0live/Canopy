import type { TFunction } from "i18next";
import { GeoLayerIssueCode, GeoLayerProperty } from "@/features/data/services/geo-parsing/core/enums";
import { type GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import type { GeoLayerMetadata, GeoLayerWarning } from "@/features/data/services/geo-parsing/core/types";
import { validateLayer } from "@/features/data/services/geo-parsing/validation/validateLayer";
import { type GeoMetadataErrors, GeoMetadataField } from "@/features/data/types";

const MESSAGES_PREFIX = "data.load.postgis";
const ERRORS_PREFIX = `${MESSAGES_PREFIX}.parseErrors`;
/** Key variant used when an error carries none of its optional details */
const GENERIC_VARIANT = "generic";

/** Optional params that select a more precise message, in priority order */
const ERROR_DETAILS: Partial<Record<GeoParseErrorCode, readonly string[]>> = {
  [GeoParseErrorCode.CORRUPTED]: ["feature", "component", "shapeType"],
  [GeoParseErrorCode.UNSUPPORTED_DIMENSIONS]: ["feature"],
};

const ISSUE_KEYS: Record<GeoLayerIssueCode, string> = {
  [GeoLayerIssueCode.EPSG_NOT_FOUND]: `${MESSAGES_PREFIX}.errors.epsgMissing`,
  [GeoLayerIssueCode.GEOMETRY_UNKNOWN]: `${MESSAGES_PREFIX}.errors.geometryUnknown`,
  [GeoLayerIssueCode.GEOMETRY_MIXED]: `${MESSAGES_PREFIX}.errors.geometryMixed`,
};

const ISSUE_FIELDS: Record<GeoLayerProperty, GeoMetadataField> = {
  [GeoLayerProperty.GEOMETRY_TYPE]: GeoMetadataField.GEOMETRY_TYPE,
  [GeoLayerProperty.EPSG]: GeoMetadataField.EPSG,
};

function parseErrorKey({ code, params }: GeoParseError): string {
  if (code === GeoParseErrorCode.ARCHIVE_UNSAFE) return `${ERRORS_PREFIX}.${code}.${params.reason}`;
  const details = ERROR_DETAILS[code];
  if (!details) return `${ERRORS_PREFIX}.${code}`;
  const detail = details.find((param) => Object.hasOwn(params, param));
  return `${ERRORS_PREFIX}.${code}.${detail ?? GENERIC_VARIANT}`;
}

/** User message of a failed parse; system values in params (dimension) are translated too */
export function parseErrorMessage(error: GeoParseError, t: TFunction): string {
  const params = { ...error.params };
  if (params.dimension !== undefined) params.dimension = t(`${MESSAGES_PREFIX}.dimensions.${params.dimension}`);
  return t(parseErrorKey(error), params);
}

export function warningMessage({ code, params }: GeoLayerWarning, t: TFunction): string {
  return t(`${MESSAGES_PREFIX}.warnings.${code}`, params);
}

/** Blocking layer issues as i18n keys, keyed by the metadata card they concern */
export function layerErrors(layer: GeoLayerMetadata | undefined): GeoMetadataErrors {
  if (!layer) return {};
  return Object.fromEntries(
    validateLayer(layer).map(({ code, property }) => [ISSUE_FIELDS[property], ISSUE_KEYS[code]]),
  );
}
