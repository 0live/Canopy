import type { ReadableFile } from "@loaders.gl/loader-utils";
import {
  DBF_FIELD_DESCRIPTOR_SIZE,
  DBF_HEADER_SIZE,
} from "@/features/data/services/geo-parsing/core/constants";
import { ShapefileComponent } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import { readExact } from "@/features/data/services/geo-parsing/formats/fileReads";

/** Field name is still raw: its encoding is only known once .cpg and LDID are combined */
export interface DbfFieldDescriptor {
  nameBytes: Uint8Array;
  /** dBase type letter, e.g. "C", "N", "D" */
  typeCode: string;
}

export interface DbfHeader {
  recordCount: number;
  /** Language driver ID (byte 29), 0 when not set */
  languageDriverId: number;
  fields: DbfFieldDescriptor[];
}

/** dBase III layout, as written by ArcGIS, GDAL and QGIS */
const RECORD_COUNT_OFFSET = 4;
const HEADER_LENGTH_OFFSET = 8;
const LANGUAGE_DRIVER_OFFSET = 29;
const FIELD_NAME_LENGTH = 11;
const FIELD_TYPE_OFFSET = 11;
const DESCRIPTORS_TERMINATOR = 0x0d;
const LITTLE_ENDIAN = true;

function parseDescriptor(view: DataView, offset: number): DbfFieldDescriptor {
  const raw = new Uint8Array(view.buffer, view.byteOffset + offset, FIELD_NAME_LENGTH);
  const end = raw.indexOf(0);
  return {
    nameBytes: end === -1 ? raw : raw.subarray(0, end),
    typeCode: String.fromCharCode(view.getUint8(offset + FIELD_TYPE_OFFSET)),
  };
}

/** Like shapelib, stops at the terminator but tolerates its absence */
function parseDescriptors(view: DataView): DbfFieldDescriptor[] {
  const fields: DbfFieldDescriptor[] = [];
  for (let offset = 0; offset + DBF_FIELD_DESCRIPTOR_SIZE <= view.byteLength; offset += DBF_FIELD_DESCRIPTOR_SIZE) {
    if (view.getUint8(offset) === DESCRIPTORS_TERMINATOR) break;
    fields.push(parseDescriptor(view, offset));
  }
  return fields;
}

/** Reads the header and field descriptors only: records are never loaded */
export async function readDbfHeader(dbf: ReadableFile): Promise<DbfHeader> {
  const main = await readExact(dbf, 0, DBF_HEADER_SIZE, ShapefileComponent.DBF);
  const headerLength = main.getUint16(HEADER_LENGTH_OFFSET, LITTLE_ENDIAN);
  // At least the terminator byte follows the main header
  if (headerLength <= DBF_HEADER_SIZE) {
    throw new GeoParseError(GeoParseErrorCode.CORRUPTED, { component: ShapefileComponent.DBF });
  }
  const descriptors = await readExact(dbf, DBF_HEADER_SIZE, headerLength - DBF_HEADER_SIZE, ShapefileComponent.DBF);
  return {
    recordCount: main.getUint32(RECORD_COUNT_OFFSET, LITTLE_ENDIAN),
    languageDriverId: main.getUint8(LANGUAGE_DRIVER_OFFSET),
    fields: parseDescriptors(descriptors),
  };
}
