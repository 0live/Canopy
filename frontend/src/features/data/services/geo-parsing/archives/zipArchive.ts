import type { ReadableFile } from "@loaders.gl/loader-utils";
import { configure, ZipReader, type Entry, type FileEntry } from "@zip.js/zip.js";
import { ReadableFileReader } from "@/features/data/services/geo-parsing/archives/readableFileReader";
import { ZipEntryFile } from "@/features/data/services/geo-parsing/archives/zipEntryFile";
import { assertSafeArchive, isIgnoredEntryPath } from "@/features/data/services/geo-parsing/archives/zipGuards";
import { GEO_IMPORT_LIMITS, type GeoImportLimits } from "@/features/data/services/geo-parsing/core/config";
import { READ_CHUNK_BYTES } from "@/features/data/services/geo-parsing/core/constants";
import { GeoParseError, GeoParseErrorCode, isAbortError } from "@/features/data/services/geo-parsing/core/errors";
import type { VirtualFileSet } from "@/features/data/services/geo-parsing/core/types";

// Parsing already runs in our own Web Worker: zip.js must not spawn nested workers
configure({ useWebWorkers: false, chunkSize: READ_CHUNK_BYTES });

async function readEntries(file: ReadableFile, signal: AbortSignal): Promise<Entry[]> {
  try {
    return await new ZipReader(new ReadableFileReader(file)).getEntries();
  } catch (error) {
    if (signal.aborted || isAbortError(error)) throw error;
    throw new GeoParseError(GeoParseErrorCode.CORRUPTED, {}, { cause: error });
  }
}

function isDatasetFile(entry: Entry): entry is FileEntry {
  return !entry.directory && !isIgnoredEntryPath(entry.filename);
}

/**
 * Lists a ZIP archive as a VirtualFileSet, reading only its central directory.
 * Entries are decompressed lazily, when a parser reads them.
 */
export async function openZipArchive(
  file: ReadableFile,
  signal: AbortSignal,
  limits: GeoImportLimits = GEO_IMPORT_LIMITS,
): Promise<VirtualFileSet> {
  signal.throwIfAborted();
  const entries = await readEntries(file, signal);
  signal.throwIfAborted();
  assertSafeArchive(entries, file.size, limits);
  return new Map(
    entries.filter(isDatasetFile).map((entry) => [entry.filename, new ZipEntryFile(entry, signal)]),
  );
}
