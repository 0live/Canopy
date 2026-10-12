import { BlobFile, type ReadableFile } from "@loaders.gl/loader-utils";
import { openZipArchive } from "@/features/data/services/geo-parsing/archives/zipArchive";
import { GEO_IMPORT_LIMITS, type GeoImportLimits } from "@/features/data/services/geo-parsing/core/config";
import { MIB } from "@/features/data/services/geo-parsing/core/constants";
import { GeoParseError, GeoParseErrorCode, toGeoParseError } from "@/features/data/services/geo-parsing/core/errors";
import type { GeoFileMetadata, ParseContext, VirtualFileSet } from "@/features/data/services/geo-parsing/core/types";
import {
  findUploadFormat,
  UploadContainer,
  type UploadFormat,
} from "@/features/data/services/geo-parsing/extract/registry";

function assertSize(file: File, limits: GeoImportLimits): void {
  if (file.size <= limits.maxFileSizeBytes) return;
  throw new GeoParseError(GeoParseErrorCode.TOO_LARGE, { maxSizeMb: Math.floor(limits.maxFileSizeBytes / MIB) });
}

interface FileSetSource {
  file: File;
  format: UploadFormat;
  signal: AbortSignal;
  limits: GeoImportLimits;
}

async function toFileSet({ file, format, signal, limits }: FileSetSource): Promise<VirtualFileSet> {
  const readable: ReadableFile = new BlobFile(file);
  const files: VirtualFileSet =
    format.container === UploadContainer.ZIP
      ? await openZipArchive(readable, signal, limits)
      : new Map([[file.name, readable]]);
  if (!format.parser.canParse(files)) throw new GeoParseError(GeoParseErrorCode.UNSUPPORTED_FORMAT);
  return files;
}

async function extract(file: File, ctx: ParseContext, limits: GeoImportLimits): Promise<GeoFileMetadata> {
  const start = performance.now();
  assertSize(file, limits);
  const format = findUploadFormat(file.name);
  if (!format) throw new GeoParseError(GeoParseErrorCode.UNSUPPORTED_FORMAT);
  const files = await toFileSet({ file, format, signal: ctx.signal, limits });
  const layers = await format.parser.parse(files, ctx);
  ctx.onProgress(file.size, file.size);
  return {
    fileName: file.name,
    fileSize: file.size,
    format: format.parser.format,
    layers,
    parseTimeMs: Math.round(performance.now() - start),
  };
}

/**
 * Entry point: reads the metadata of an uploaded file without loading it whole.
 * Always rejects with a GeoParseError, whatever failed underneath.
 * Blocking layer issues are not errors here: see validation/validateLayer.
 */
export async function extractGeoMetadata(
  file: File,
  ctx: ParseContext,
  limits: GeoImportLimits = GEO_IMPORT_LIMITS,
): Promise<GeoFileMetadata> {
  try {
    return await extract(file, ctx, limits);
  } catch (error) {
    throw toGeoParseError(error);
  }
}
