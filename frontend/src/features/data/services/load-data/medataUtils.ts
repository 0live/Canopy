import { load } from "@loaders.gl/core";
import type { DataType, Feature, Schema } from "@loaders.gl/schema";
import { DBFLoader } from "@loaders.gl/shapefile";
import { EXTENSION_TO_FORMAT, GeoFieldType, GeoFormat, SHP_GEOMETRY_TYPES, type GeoField, type GeoLayerMetadata } from "../../types";

export function detectFormat(file: File): GeoFormat {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_FORMAT[ext] ?? GeoFormat.UNKNOWN;
}

export function mapDataType(type: DataType): GeoFieldType {
  if (typeof type !== "string") return GeoFieldType.UNKNOWN;
  if (type === "utf8") return GeoFieldType.STRING;
  if (type === "binary") return GeoFieldType.BINARY;
  if (type === "bool") return GeoFieldType.BOOLEAN;
  if (type.startsWith("int") || type.startsWith("uint") || type.startsWith("float")) return GeoFieldType.NUMBER;
  if (type.startsWith("date") || type.startsWith("timestamp") || type.startsWith("time")) return GeoFieldType.DATE;
  return GeoFieldType.UNKNOWN;
}

export function fieldsFromSchema(schema: Schema): GeoField[] {
  return schema.fields
    .filter((f) => f.name !== "geometry")
    .map((f) => ({ name: f.name, type: mapDataType(f.type) }));
}

export function inferFieldTypeFromValue(value: unknown): GeoFieldType {
  if (value === null || value === undefined) return GeoFieldType.UNKNOWN;
  if (typeof value === "boolean") return GeoFieldType.BOOLEAN;
  if (typeof value === "number") return GeoFieldType.NUMBER;
  if (typeof value === "string") {
    if (!isNaN(Date.parse(value)) && value.length > 8) return GeoFieldType.DATE;
    return GeoFieldType.STRING;
  }
  return GeoFieldType.UNKNOWN;
}

export function fieldsFromFeature(feature: Feature): GeoField[] {
  if (!feature?.properties) return [];
  return Object.entries(feature.properties).map(([name, val]) => ({
    name,
    type: inferFieldTypeFromValue(val),
  }));
}

export function toBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
}

export function parseSHPHeader(buffer: ArrayBuffer): { geometryType: string; bbox: [number, number, number, number] } {
  const view = new DataView(buffer);
  const shapeType = view.getInt32(32, true);
  // Bounding box: Xmin@36, Ymin@44, Xmax@52, Ymax@60 (little-endian doubles)
  const bbox: [number, number, number, number] = [
    view.getFloat64(36, true), view.getFloat64(44, true),
    view.getFloat64(52, true), view.getFloat64(60, true),
  ];
  return { geometryType: SHP_GEOMETRY_TYPES[shapeType] ?? "Unknown", bbox };
}

export async function parseDbfFields(buffer: ArrayBuffer): Promise<GeoField[]> {
  const result = await load(buffer, DBFLoader, { dbf: { shape: "table" } }) as { schema?: Schema };
  return result.schema ? fieldsFromSchema(result.schema) : [];
}

export function updateBbox(current: GeoLayerMetadata["bbox"], geometry: Feature["geometry"]): GeoLayerMetadata["bbox"] {
  if (!geometry || !("coordinates" in geometry)) return current;
  const coords = flattenCoords(geometry.coordinates as unknown[]);
  if (!coords.length) return current;
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);
  const next: GeoLayerMetadata["bbox"] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  if (!current) return next;
  return [Math.min(current[0], next[0]), Math.min(current[1], next[1]), Math.max(current[2], next[2]), Math.max(current[3], next[3])];
}

export function flattenCoords(coords: unknown[]): number[][] {
  if (!Array.isArray(coords)) return [];
  if (typeof coords[0] === "number") return [coords as number[]];
  return (coords as unknown[][]).flatMap(flattenCoords);
}