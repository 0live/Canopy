import { shapefileParser } from "@/features/data/services/geo-parsing/formats/shapefile/shapefileParser";
import { geojsonParser } from "@/features/data/services/geo-parsing/formats/geojson/geojsonParser";
import { extensionOf } from "@/features/data/services/geo-parsing/core/paths";
import type { GeoFormatParser } from "@/features/data/services/geo-parsing/core/types";

/** How the uploaded file is turned into the file set given to the parser */
export const UploadContainer = {
  /** The file itself is the dataset */
  PLAIN: "plain",
  /** A ZIP archive whose entries form the dataset */
  ZIP: "zip",
} as const;

export type UploadContainer = (typeof UploadContainer)[keyof typeof UploadContainer];

export interface UploadFormat {
  container: UploadContainer;
  parser: GeoFormatParser;
}

/**
 * Upload extension → format. A ZIP is always a Shapefile: other files in the archive
 * (e.g. a metadata .json) are never examined. Multi-file formats added later
 * (MapInfo TAB, File Geodatabase) would be found inside the archive.
 */
const UPLOAD_FORMATS: Readonly<Record<string, UploadFormat>> = {
  zip: { container: UploadContainer.ZIP, parser: shapefileParser },
  geojson: { container: UploadContainer.PLAIN, parser: geojsonParser },
  json: { container: UploadContainer.PLAIN, parser: geojsonParser },
};

export const UPLOAD_EXTENSIONS: readonly string[] = Object.keys(UPLOAD_FORMATS);

export function findUploadFormat(fileName: string): UploadFormat | null {
  const extension = extensionOf(fileName);
  return Object.hasOwn(UPLOAD_FORMATS, extension) ? UPLOAD_FORMATS[extension] : null;
}
