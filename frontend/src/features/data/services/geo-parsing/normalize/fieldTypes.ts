import type { DataType, Field } from "@loaders.gl/schema";
import { GeoFieldType } from "@/features/data/services/geo-parsing/core/enums";
import type { GeoField } from "@/features/data/services/geo-parsing/core/types";

export interface FieldTypeMerge {
  type: GeoFieldType;
  /** True when both types were known and incompatible */
  conflict: boolean;
}

const NUMERIC_DATA_TYPES: ReadonlySet<string> = new Set([
  "int", "int8", "int16", "int32", "int64",
  "uint8", "uint16", "uint32", "uint64",
  "float", "float16", "float32", "float64",
]);

const SIMPLE_DATA_TYPES: Readonly<Record<string, GeoFieldType>> = {
  utf8: GeoFieldType.STRING,
  bool: GeoFieldType.BOOLEAN,
  binary: GeoFieldType.BINARY,
};

const DATE_DATA_TYPE_PREFIXES = ["date-", "timestamp-"];

/** ISO 8601 date or date-time only: Date.parse alone accepts free text like "May 3" */
const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** Maps a loaders.gl schema type (shared by all loaders) to our field type */
export function fromSchemaDataType(dataType: DataType): GeoFieldType {
  if (typeof dataType !== "string") {
    return dataType.type === "decimal" ? GeoFieldType.NUMBER : GeoFieldType.UNKNOWN;
  }
  if (NUMERIC_DATA_TYPES.has(dataType)) return GeoFieldType.NUMBER;
  if (DATE_DATA_TYPE_PREFIXES.some((prefix) => dataType.startsWith(prefix))) return GeoFieldType.DATE;
  return SIMPLE_DATA_TYPES[dataType] ?? GeoFieldType.UNKNOWN;
}

export function fromSchemaField(field: Field, nativeType: string | null = null): GeoField {
  return { name: field.name, type: fromSchemaDataType(field.type), nativeType };
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
