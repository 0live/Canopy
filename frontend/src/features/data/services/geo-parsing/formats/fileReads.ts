import type { ReadableFile } from "@loaders.gl/loader-utils";
import { SIDECAR_MAX_BYTES } from "@/features/data/services/geo-parsing/core/constants";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";

function corrupted(component: string): GeoParseError {
  return new GeoParseError(GeoParseErrorCode.CORRUPTED, { component });
}

/** Reads exactly [start, start + length): a shorter file is a truncated, i.e. corrupted, one */
export async function readExact(
  file: ReadableFile,
  start: number,
  length: number,
  component: string,
): Promise<DataView> {
  if (start + length > file.size) throw corrupted(component);
  const buffer = await file.read(start, length);
  if (buffer.byteLength < length) throw corrupted(component);
  return new DataView(buffer);
}

/** Reads a whole small text sidecar (.prj, .cpg); an oversized one cannot be genuine */
export async function readSidecarText(file: ReadableFile, component: string): Promise<string> {
  if (file.size > SIDECAR_MAX_BYTES) throw corrupted(component);
  if (file.size === 0) return "";
  const view = await readExact(file, 0, file.size, component);
  // UTF-8 decoding also strips a leading BOM
  return new TextDecoder().decode(view);
}
