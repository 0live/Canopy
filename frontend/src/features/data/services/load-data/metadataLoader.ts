import { loadInBatches } from "@loaders.gl/core";
import { JSONLoader } from "@loaders.gl/json";
import type { Feature, GeoJSONTableBatch } from "@loaders.gl/schema";
import { unzipSync } from "fflate";
import {
  type GeoField,
  type GeoFileMetadata,
  GeoFormat,
  type GeoLayerMetadata,
  GeometryType
} from "../../types";
import { detectFormat, fieldsFromFeature, parseDbfFields, parseSHPHeader, toBuffer } from "./medataUtils";

const MAX_GEOJSON_FEATURES_SCAN = 10;

async function parseShapefileZip(file: File): Promise<GeoLayerMetadata> {
  const raw = new Uint8Array(await file.arrayBuffer());
  const entries = unzipSync(raw);
  const findBuffer = (ext: string): ArrayBuffer | null => {
    const key = Object.keys(entries).find(k => k.toLowerCase().endsWith(ext));
    return key ? toBuffer(entries[key]) : null;
  };
  const shpBuffer = findBuffer(".shp");
  if (!shpBuffer) throw new Error("No .shp file found in archive");
  const { geometryType } = parseSHPHeader(shpBuffer);
  const dbfBuffer = findBuffer(".dbf");
  const prjBuffer = findBuffer(".prj");
  console.log(new TextDecoder().decode(prjBuffer!))
  return {
    name: file.name,
    geometryType,
    epsg: prjBuffer ? new TextDecoder().decode(prjBuffer) : null,
    fields: dbfBuffer ? await parseDbfFields(dbfBuffer) : [],
  };
}



async function parseGeoJson(file: File): Promise<GeoLayerMetadata> {
  const batches = await loadInBatches(file, JSONLoader, {
    batchSize: MAX_GEOJSON_FEATURES_SCAN,
  });

  let fields: GeoField[] = [];
  let geometryType: GeometryType = GeometryType.UNKNOWN;

  for await (const batch of batches as AsyncIterable<GeoJSONTableBatch>) {
    const features = batch.data as unknown as Feature[];
    if (features.length > 0) {
      fields = fieldsFromFeature(features[0]);
      geometryType = (features[0]?.geometry?.type as GeometryType)?? GeometryType.UNKNOWN;
      break;
    }
  }

  return {
    name: file.name,
    geometryType,
    epsg: "EPSG:4326",
    fields,
  };
}

export async function extractGeoMetadata(file: File): Promise<GeoFileMetadata> {
  const start = performance.now();
  const format = detectFormat(file);

  const layerParsers: Record<GeoFormat, (f: File) => Promise<GeoLayerMetadata>> = {
    [GeoFormat.SHAPEFILE]: parseShapefileZip,
    [GeoFormat.GEOJSON]: parseGeoJson,
    [GeoFormat.UNKNOWN]: async (f) => ({
      name: f.name, geometryType: GeometryType.UNKNOWN, epsg: null, fields: [],
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
