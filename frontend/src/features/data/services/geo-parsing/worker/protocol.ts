import type { GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import type { GeoFileMetadata, GeoMessageParams } from "@/features/data/services/geo-parsing/core/types";

/**
 * Messages between the main thread and the parse worker. One worker runs one
 * parse and is then terminated, so messages carry no parse id.
 */
export const WorkerRequestType = {
  PARSE: "parse",
  EPSG_RESOLVED: "epsgResolved",
  /** The main thread could not reach the EPSG API */
  EPSG_FAILED: "epsgFailed",
} as const;

export const WorkerResponseType = {
  PROGRESS: "progress",
  /** The worker has no API access: it asks the main thread to resolve a WKT */
  EPSG_REQUEST: "epsgRequest",
  DONE: "done",
  FAILED: "failed",
} as const;

export type WorkerRequest =
  | { type: typeof WorkerRequestType.PARSE; file: File }
  | { type: typeof WorkerRequestType.EPSG_RESOLVED; requestId: number; epsg: string | null }
  | { type: typeof WorkerRequestType.EPSG_FAILED; requestId: number };

/** A GeoParseError reduced to structured-cloneable data */
export interface SerializedGeoParseError {
  code: GeoParseErrorCode;
  params: GeoMessageParams;
}

export type WorkerResponse =
  | { type: typeof WorkerResponseType.PROGRESS; bytesRead: number; totalBytes: number }
  | { type: typeof WorkerResponseType.EPSG_REQUEST; requestId: number; wkt: string }
  | { type: typeof WorkerResponseType.DONE; metadata: GeoFileMetadata }
  | { type: typeof WorkerResponseType.FAILED; error: SerializedGeoParseError };
