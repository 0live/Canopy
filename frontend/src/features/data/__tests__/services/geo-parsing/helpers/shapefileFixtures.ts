import { ShpShapeType } from "@/features/data/services/geo-parsing/normalize/geometryTypes";
import { memoryFile } from "@/features/data/__tests__/services/geo-parsing/helpers/files";
import type { VirtualFileSet } from "@/features/data/services/geo-parsing/core/types";

const SHP_HEADER_SIZE = 100;
const SHX_RECORD_SIZE = 8;
const DBF_HEADER_SIZE = 32;
const DBF_DESCRIPTOR_SIZE = 32;
const DBF_TERMINATOR = 0x0d;

export const WGS84_ESRI_WKT =
  'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],' +
  'PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';

export interface ShpHeaderOptions {
  shapeType?: number;
  fileCode?: number;
  version?: number;
  /** Number of .shx records appended after the header */
  records?: number;
}

/** .shp / .shx main header followed by `records` zeroed 8-byte records */
export function shpBytes({
  shapeType = ShpShapeType.POINT,
  fileCode = 9994,
  version = 1000,
  records = 0,
}: ShpHeaderOptions = {}): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(SHP_HEADER_SIZE + records * SHX_RECORD_SIZE);
  const view = new DataView(bytes.buffer);
  view.setInt32(0, fileCode, false);
  view.setInt32(24, bytes.length / 2, false);
  view.setInt32(28, version, true);
  view.setInt32(32, shapeType, true);
  return bytes;
}

export interface DbfFieldSpec {
  name: string | Uint8Array;
  type: string;
}

export interface DbfOptions {
  fields?: DbfFieldSpec[];
  records?: number;
  languageDriverId?: number;
}

function writeDescriptor(bytes: Uint8Array, offset: number, { name, type }: DbfFieldSpec): void {
  const nameBytes = typeof name === "string" ? new TextEncoder().encode(name) : name;
  bytes.set(nameBytes.subarray(0, 11), offset);
  bytes[offset + 11] = type.charCodeAt(0);
}

/** DBF header and descriptors only, the record area is left out */
export function dbfBytes({ fields = [], records = 0, languageDriverId = 0 }: DbfOptions = {}): Uint8Array<ArrayBuffer> {
  const headerLength = DBF_HEADER_SIZE + fields.length * DBF_DESCRIPTOR_SIZE + 1;
  const bytes = new Uint8Array(headerLength);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x03;
  view.setUint32(4, records, true);
  view.setUint16(8, headerLength, true);
  bytes[29] = languageDriverId;
  fields.forEach((field, index) => writeDescriptor(bytes, DBF_HEADER_SIZE + index * DBF_DESCRIPTOR_SIZE, field));
  bytes[headerLength - 1] = DBF_TERMINATOR;
  return bytes;
}

export type ShapefileEntries = Record<string, Uint8Array<ArrayBuffer> | string>;

/** A valid 2D point dataset "roads" with 3 records and 2 fields, to be overridden per test */
export function validShapefileEntries(stem = "roads"): ShapefileEntries {
  return {
    [`${stem}.shp`]: shpBytes(),
    [`${stem}.shx`]: shpBytes({ records: 3 }),
    [`${stem}.dbf`]: dbfBytes({
      records: 3,
      languageDriverId: 87,
      fields: [
        { name: "NOM", type: "C" },
        { name: "POP", type: "N" },
      ],
    }),
    [`${stem}.prj`]: WGS84_ESRI_WKT,
  };
}

export function toFileSet(entries: ShapefileEntries): VirtualFileSet {
  return new Map(Object.entries(entries).map(([path, content]) => [path, memoryFile(content)]));
}
