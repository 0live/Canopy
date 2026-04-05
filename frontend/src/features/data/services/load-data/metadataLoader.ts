import { loadInBatches } from "@loaders.gl/core";
import { FlatGeobufLoader } from "@loaders.gl/flatgeobuf";
import { JSONLoader } from "@loaders.gl/json";
import type { Feature, GeoJSONTableBatch } from "@loaders.gl/schema";
import { unzipSync } from "fflate";
import {
  FGB_GEOMETRY_TYPES,
  type GeoField,
  type GeoFileMetadata,
  GeoFormat,
  type GeoLayerMetadata
} from "../../types";
import { detectFormat, fieldsFromFeature, fieldsFromSchema, parseDbfFields, parseSHPHeader, toBuffer, updateBbox } from "./medataUtils";

const MAX_GEOJSON_FEATURES_SCAN = 500;

async function parseFlatGeobuf(file: File): Promise<GeoLayerMetadata> {
  const batches = await loadInBatches(file, FlatGeobufLoader);
  for await (const batch of batches as AsyncIterable<GeoJSONTableBatch>) {
    const { schema, features } = batch;
    const meta = schema?.metadata ?? {};
    const crs = meta.crs ? (JSON.parse(meta.crs) as { org?: string; code?: number }) : null;
    return {
      name: file.name,
      geometryType: FGB_GEOMETRY_TYPES[meta.geometryType] ?? "Unknown",
      featureCount: meta.featureCount ? parseInt(meta.featureCount, 10) : null,
      epsg: crs?.org && crs?.code ? `${crs.org}:${crs.code}` : null,
      bbox: null,
      fields: schema ? fieldsFromSchema(schema) : fieldsFromFeature(features[0]),
    };
  }
  return { name: file.name, geometryType: "Unknown", featureCount: null, epsg: null, bbox: null, fields: [] };
}

async function parseShapefileZip(file: File): Promise<GeoLayerMetadata> {
  const raw = new Uint8Array(await file.arrayBuffer());
  const entries = unzipSync(raw);
  const findBuffer = (ext: string): ArrayBuffer | null => {
    const key = Object.keys(entries).find(k => k.toLowerCase().endsWith(ext));
    return key ? toBuffer(entries[key]) : null;
  };
  const shpBuffer = findBuffer(".shp");
  if (!shpBuffer) throw new Error("No .shp file found in archive");
  const { geometryType, bbox } = parseSHPHeader(shpBuffer);
  const dbfBuffer = findBuffer(".dbf");
  const prjBuffer = findBuffer(".prj");
  return {
    name: file.name,
    geometryType,
    featureCount: null,
    epsg: prjBuffer ? new TextDecoder().decode(prjBuffer) : null,
    bbox,
    fields: dbfBuffer ? await parseDbfFields(dbfBuffer) : [],
  };
}



async function parseGeoJson(file: File): Promise<GeoLayerMetadata> {
  const batches = await loadInBatches(file, JSONLoader, {
    json: { jsonpaths: ["$.features"] },
  });

  let fields: GeoField[] = [];
  let geometryType = "Unknown";
  let featureCount = 0;
  let bbox: GeoLayerMetadata["bbox"] = null;

  for await (const batch of batches as AsyncIterable<GeoJSONTableBatch>) {
    for (const feature of batch.data as unknown as Feature[]) {
      featureCount++;
      if (featureCount === 1) {
        fields = fieldsFromFeature(feature);
        geometryType = feature?.geometry?.type ?? "Unknown";
      }
      bbox = updateBbox(bbox, feature.geometry);
      if (featureCount >= MAX_GEOJSON_FEATURES_SCAN) break;
    }
    if (featureCount >= MAX_GEOJSON_FEATURES_SCAN) break;
  }

  const scanLimited = featureCount >= MAX_GEOJSON_FEATURES_SCAN;
  return {
    name: file.name,
    geometryType,
    featureCount: scanLimited ? null : featureCount,
    epsg: "EPSG:4326",
    bbox: scanLimited ? null : bbox,
    fields,
  };
}

export async function extractGeoMetadata(file: File): Promise<GeoFileMetadata> {
  const start = performance.now();
  const format = detectFormat(file);

  const layerParsers: Record<GeoFormat, (f: File) => Promise<GeoLayerMetadata>> = {
    [GeoFormat.FLATGEOBUF]: parseFlatGeobuf,
    [GeoFormat.SHAPEFILE]: parseShapefileZip,
    [GeoFormat.GEOJSON]: parseGeoJson,
    [GeoFormat.UNKNOWN]: async (f) => ({
      name: f.name, geometryType: "Unknown", featureCount: null, epsg: null, bbox: null, fields: [],
    }),
  };

  const layer = await layerParsers[format](file);
  return {
    fileName: file.name,
    fileSize: file.size,
    format,
    layers: [layer],
    parseTimeMs: Math.round(performance.now() - start),
  };
}
