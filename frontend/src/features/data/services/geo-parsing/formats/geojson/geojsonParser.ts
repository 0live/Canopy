import type { ReadableFile } from "@loaders.gl/loader-utils";
import {
  GEOJSON_DEFAULT_EPSG,
  GEOJSON_ENCODING,
  WGS84_BOUNDS,
} from "@/features/data/services/geo-parsing/core/constants";
import { GeoFormat, GeometryType } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import { extensionOf, fileStemOf } from "@/features/data/services/geo-parsing/core/paths";
import type {
  GeoFormatParser,
  GeoLayerMetadata,
  ParseContext,
  VirtualFileSet,
} from "@/features/data/services/geo-parsing/core/types";
import { streamGeoJson } from "@/features/data/services/geo-parsing/formats/geojson/geojsonStream";
import {
  GeoJsonLayerAccumulator,
  type GeoJsonLayerSummary,
} from "@/features/data/services/geo-parsing/formats/geojson/layerAccumulator";
import { resolveGeoJsonCrs } from "@/features/data/services/geo-parsing/normalize/crs";
import { fromGeoJsonType } from "@/features/data/services/geo-parsing/normalize/geometryTypes";

const GEOJSON_EXTENSIONS = ["geojson", "json"] as const;
const FEATURE_COLLECTION_TYPE = "FeatureCollection";
const FEATURE_TYPE = "Feature";

type JsonObject = Record<string, unknown>;

function isGeoJsonPath(path: string): boolean {
  return (GEOJSON_EXTENSIONS as readonly string[]).includes(extensionOf(path));
}

function findSingleGeoJson(files: VirtualFileSet): [string, ReadableFile] {
  const entries = [...files].filter(([path]) => isGeoJsonPath(path));
  if (entries.length === 0) throw new GeoParseError(GeoParseErrorCode.UNSUPPORTED_FORMAT);
  if (entries.length > 1) throw new GeoParseError(GeoParseErrorCode.MULTIPLE_LAYERS, { count: entries.length });
  return entries[0];
}

/** RFC 7946 also allows a single Feature or a bare geometry as root: both make a one-feature layer */
function completeRoot(root: unknown, layer: GeoJsonLayerAccumulator): JsonObject {
  if (typeof root !== "object" || root === null) throw new GeoParseError(GeoParseErrorCode.UNSUPPORTED_FORMAT);
  const rootObject = root as JsonObject;
  if (rootObject.type === FEATURE_COLLECTION_TYPE) {
    if (!Array.isArray(rootObject.features)) throw new GeoParseError(GeoParseErrorCode.CORRUPTED);
    return rootObject;
  }
  // Features were streamed from a root that turns out not to be a FeatureCollection
  if (layer.count > 0) throw new GeoParseError(GeoParseErrorCode.UNSUPPORTED_FORMAT);
  if (rootObject.type === FEATURE_TYPE) layer.add(rootObject);
  else if (fromGeoJsonType(String(rootObject.type)) !== GeometryType.UNKNOWN) {
    layer.add({ type: FEATURE_TYPE, properties: null, geometry: rootObject });
  } else throw new GeoParseError(GeoParseErrorCode.UNSUPPORTED_FORMAT);
  return rootObject;
}

function toMetadata(name: string, root: JsonObject, summary: GeoJsonLayerSummary): GeoLayerMetadata {
  if (summary.featureCount === 0) throw new GeoParseError(GeoParseErrorCode.EMPTY);
  const { epsg, source, warnings: crsWarnings } = resolveGeoJsonCrs(root.crs);
  // Projected metres read as degrees: the CRS is missing or wrong, import would misplace data
  if (epsg === GEOJSON_DEFAULT_EPSG && !summary.extent.isWithin(WGS84_BOUNDS)) {
    throw new GeoParseError(GeoParseErrorCode.COORDINATES_OUT_OF_RANGE, { epsg });
  }
  return {
    name,
    geometryType: summary.geometryType,
    epsg,
    epsgSource: source,
    fields: summary.fields,
    featureCount: summary.featureCount,
    encoding: GEOJSON_ENCODING,
    warnings: [...summary.warnings, ...crsWarnings],
  };
}

async function parseGeoJson(files: VirtualFileSet, ctx: ParseContext): Promise<GeoLayerMetadata[]> {
  ctx.signal.throwIfAborted();
  const [path, file] = findSingleGeoJson(files);
  if (file.size === 0) throw new GeoParseError(GeoParseErrorCode.EMPTY);
  const layer = new GeoJsonLayerAccumulator();
  const root = await streamGeoJson(file, { ...ctx, onFeature: (feature) => layer.add(feature) });
  const rootObject = completeRoot(root, layer);
  return [toMetadata(fileStemOf(path), rootObject, layer.summarize())];
}

/** Streams the whole file once: GeoJSON has no header, every feature must be read */
export const geojsonParser: GeoFormatParser = {
  format: GeoFormat.GEOJSON,
  extensions: GEOJSON_EXTENSIONS,
  canParse: (files) => [...files.keys()].some(isGeoJsonPath),
  parse: parseGeoJson,
};
