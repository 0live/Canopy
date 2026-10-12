import { readdirSync, readFileSync } from "node:fs";

const POINTS_DIR = new URL("../fixtures/shapefile/points_latin1/", import.meta.url);

/** WKT of the GDAL fixture .prj: ESRI flavour, no EPSG authority, so the API fallback runs */
export const GDAL_ESRI_PRJ = readFileSync(new URL("points_latin1.prj", POINTS_DIR), "utf8");

/** GDAL point dataset, the way a portal ships it: in a folder of the archive */
export function gdalPointsEntries(folder = "export"): Record<string, Uint8Array> {
  return Object.fromEntries(
    readdirSync(POINTS_DIR).map((name) => [`${folder}/${name}`, new Uint8Array(readFileSync(new URL(name, POINTS_DIR)))]),
  );
}
