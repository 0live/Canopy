import { load } from "@loaders.gl/core";
import type { DataType, Feature, Schema } from "@loaders.gl/schema";
import { DBFLoader } from "@loaders.gl/shapefile";
import { EXTENSION_TO_FORMAT, GeoFieldType, GeoFormat, GeoMetadataField, GeometryType, SHP_GEOMETRY_TYPES, type GeoField, type GeoFileMetadata, type GeoMetadataErrors } from "../../types";

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
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

export function extractEpsgFromWkt(wkt: string): string | null {
  const match = wkt.match(/AUTHORITY\["EPSG","(\d+)"\]/i);
  return match ? `EPSG:${match[1]}` : null;
}

export function parseSHPHeader(buffer: ArrayBuffer): { geometryType: GeometryType } {
  const view = new DataView(buffer);
  const shapeType = view.getInt32(32, true);
  return { geometryType: SHP_GEOMETRY_TYPES[shapeType] ?? GeometryType.UNKNOWN };
}

export async function parseDbfFields(buffer: ArrayBuffer): Promise<GeoField[]> {
  const result = await load(buffer, DBFLoader, { dbf: { shape: "table" } }) as { schema?: Schema };
  return result.schema ? fieldsFromSchema(result.schema) : [];
}

export function validateLayerMetadata(metadata: GeoFileMetadata): GeoMetadataErrors {
  const layer = metadata.layers[0];
  const errors: GeoMetadataErrors = {};
  if (!layer) return errors;
  if (layer.epsg === null) errors[GeoMetadataField.EPSG] = "data.load.postgis.errors.epsgMissing";
  if (layer.geometryType === GeometryType.UNKNOWN) errors[GeoMetadataField.GEOMETRY_TYPE] = "data.load.postgis.errors.geometryUnknown";
  if (layer.fields.length === 0) errors[GeoMetadataField.FIELDS] = "data.load.postgis.errors.noFields";
  return errors;
}

