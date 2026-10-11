import type { ReadableFile } from "@loaders.gl/loader-utils";
import { SHP_HEADER_SIZE, SHX_RECORD_SIZE } from "@/features/data/services/geo-parsing/core/constants";
import { ShapefileComponent } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import { readExact } from "@/features/data/services/geo-parsing/formats/fileReads";

/** ESRI Shapefile Technical Description (1998): fields switch endianness */
const SHP_FILE_CODE = 9994;
const SHP_VERSION = 1000;
const FILE_CODE_OFFSET = 0;
const VERSION_OFFSET = 28;
const SHAPE_TYPE_OFFSET = 32;
const LITTLE_ENDIAN = true;

type ShpLikeComponent = typeof ShapefileComponent.SHP | typeof ShapefileComponent.SHX;

/**
 * Reads the shape type from the 100-byte main header shared by .shp and .shx.
 * Only the header is read: geometries are never loaded.
 */
export async function readShapeType(file: ReadableFile, component: ShpLikeComponent): Promise<number> {
  const view = await readExact(file, 0, SHP_HEADER_SIZE, component);
  const isValid =
    view.getInt32(FILE_CODE_OFFSET, !LITTLE_ENDIAN) === SHP_FILE_CODE &&
    view.getInt32(VERSION_OFFSET, LITTLE_ENDIAN) === SHP_VERSION;
  if (!isValid) throw new GeoParseError(GeoParseErrorCode.CORRUPTED, { component });
  return view.getInt32(SHAPE_TYPE_OFFSET, LITTLE_ENDIAN);
}

/** One fixed-size .shx record per shape (null shapes included), so the count needs no scan */
export function countShxRecords(shx: ReadableFile): number {
  const count = (shx.size - SHP_HEADER_SIZE) / SHX_RECORD_SIZE;
  if (!Number.isInteger(count) || count < 0) {
    throw new GeoParseError(GeoParseErrorCode.CORRUPTED, { component: ShapefileComponent.SHX });
  }
  return count;
}
