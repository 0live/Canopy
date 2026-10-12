import type { ReadableFile } from "@loaders.gl/loader-utils";
import { READ_CHUNK_BYTES } from "@/features/data/services/geo-parsing/core/constants";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import type { ParseContext } from "@/features/data/services/geo-parsing/core/types";
import { FeatureSplitter } from "@/features/data/services/geo-parsing/formats/geojson/featureSplitter";

export interface GeoJsonStreamOptions extends Pick<ParseContext, "signal" | "onProgress"> {
  onFeature: (feature: unknown) => void;
}

/** Fatal decoding: a non UTF-8 file is refused rather than silently altered */
function decode(decoder: TextDecoder, chunk?: ArrayBuffer): string {
  try {
    return chunk ? decoder.decode(chunk, { stream: true }) : decoder.decode();
  } catch (error) {
    throw new GeoParseError(GeoParseErrorCode.INVALID_ENCODING, {}, { cause: error });
  }
}

/** Parses each raw feature, numbering them from 1 for error messages */
function featureParser(onFeature: (feature: unknown) => void) {
  let count = 0;
  return (text: string) => {
    count++;
    let feature: unknown;
    try {
      feature = JSON.parse(text);
    } catch (error) {
      throw new GeoParseError(GeoParseErrorCode.CORRUPTED, { feature: count }, { cause: error });
    }
    onFeature(feature);
  };
}

/**
 * Reads a GeoJSON file chunk by chunk, hands each feature to onFeature and
 * returns the root object without its features (e.g. type and crs members).
 */
export async function streamGeoJson(
  file: ReadableFile,
  { signal, onProgress, onFeature }: GeoJsonStreamOptions,
): Promise<unknown> {
  const splitter = new FeatureSplitter();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const handleFeature = featureParser(onFeature);
  for (let offset = 0; offset < file.size; offset += READ_CHUNK_BYTES) {
    signal.throwIfAborted();
    const length = Math.min(READ_CHUNK_BYTES, file.size - offset);
    const chunk = await file.read(offset, length);
    if (chunk.byteLength < length) throw new GeoParseError(GeoParseErrorCode.CORRUPTED);
    const text = decode(decoder, chunk);
    splitter.write(text).forEach(handleFeature);
    onProgress(offset + length, file.size);
  }
  splitter.write(decode(decoder)).forEach(handleFeature);
  return splitter.end();
}
