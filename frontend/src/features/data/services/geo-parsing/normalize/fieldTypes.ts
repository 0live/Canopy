import { GeoFieldType } from "@/features/data/services/geo-parsing/core/enums";

export interface FieldTypeMerge {
  type: GeoFieldType;
  /** True when both types were known and incompatible */
  conflict: boolean;
}

/** dBase / FoxPro type letters; memo (M) is text stored in a .dbt sidecar */
const DBF_FIELD_TYPES: Readonly<Record<string, GeoFieldType>> = {
  C: GeoFieldType.STRING,
  M: GeoFieldType.STRING,
  N: GeoFieldType.NUMBER,
  F: GeoFieldType.NUMBER,
  I: GeoFieldType.NUMBER,
  B: GeoFieldType.NUMBER,
  O: GeoFieldType.NUMBER,
  Y: GeoFieldType.NUMBER,
  "+": GeoFieldType.NUMBER,
  D: GeoFieldType.DATE,
  T: GeoFieldType.DATE,
  "@": GeoFieldType.DATE,
  L: GeoFieldType.BOOLEAN,
  G: GeoFieldType.BINARY,
  P: GeoFieldType.BINARY,
};

/** ISO 8601 date or date-time only: Date.parse alone accepts free text like "May 3" */
const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

export function fromDbfFieldType(typeCode: string): GeoFieldType {
  return Object.hasOwn(DBF_FIELD_TYPES, typeCode) ? DBF_FIELD_TYPES[typeCode] : GeoFieldType.UNKNOWN;
}

/** Infers a field type from one JSON property value; empty values carry no type */
export function fromJsonValue(value: unknown): GeoFieldType {
  if (value === null || value === undefined || value === "") return GeoFieldType.UNKNOWN;
  if (typeof value === "boolean") return GeoFieldType.BOOLEAN;
  if (typeof value === "number") return GeoFieldType.NUMBER;
  if (typeof value === "string") return isIsoDate(value) ? GeoFieldType.DATE : GeoFieldType.STRING;
  // Nested objects and arrays are imported as serialized JSON text
  return GeoFieldType.STRING;
}

function isIsoDate(value: string): boolean {
  return ISO_DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

/** Combines the types of one field across features; incompatible types fall back to STRING */
export function mergeFieldTypes(a: GeoFieldType, b: GeoFieldType): FieldTypeMerge {
  if (a === b || b === GeoFieldType.UNKNOWN) return { type: a, conflict: false };
  if (a === GeoFieldType.UNKNOWN) return { type: b, conflict: false };
  return { type: GeoFieldType.STRING, conflict: true };
}
