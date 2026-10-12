import { geoApi } from "@/features/data/services/api/geoApi";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import type { GeoFileMetadata, ParseContext } from "@/features/data/services/geo-parsing/core/types";
import GeoParseWorker from "@/features/data/services/geo-parsing/worker/geoParse.worker?worker";
import { parseInWorker, type ParseWorker } from "@/features/data/services/geo-parsing/worker/parseInWorker";

export type GeoParseOptions = Pick<ParseContext, "signal" | "onProgress">;

/** The worker constructor throws synchronously when the script cannot be created */
function createWorker(): ParseWorker {
  try {
    return new GeoParseWorker();
  } catch (error) {
    throw new GeoParseError(GeoParseErrorCode.UNEXPECTED, {}, { cause: error });
  }
}

/**
 * App entry point: reads a geo file's metadata in a dedicated worker, so a
 * large GeoJSON scan never freezes the UI. EPSG fallback goes through the API.
 */
export async function parseGeoFile(file: File, options: GeoParseOptions): Promise<GeoFileMetadata> {
  return parseInWorker(createWorker(), file, { ...options, resolveEpsg: geoApi.detectEpsg });
}
