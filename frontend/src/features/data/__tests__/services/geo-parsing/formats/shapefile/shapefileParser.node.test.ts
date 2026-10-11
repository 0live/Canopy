import { readdirSync, readFileSync } from "node:fs";
import { openZipArchive } from "@/features/data/services/geo-parsing/archives/zipArchive";
import { EpsgSource, GeoFieldType, GeometryType } from "@/features/data/services/geo-parsing/core/enums";
import type { ParseContext, VirtualFileSet } from "@/features/data/services/geo-parsing/core/types";
import { shapefileParser } from "@/features/data/services/geo-parsing/formats/shapefile/shapefileParser";
import { memoryFile } from "@/features/data/__tests__/services/geo-parsing/helpers/files";
import { buildZip } from "@/features/data/__tests__/services/geo-parsing/helpers/zipFixtures";

/** Datasets written by GDAL 3.8, see fixtures/shapefile/generate.sh */
const FIXTURES_DIR = new URL("../../fixtures/shapefile/", import.meta.url);
/** What the backend answers for the ESRI .prj written by GDAL (pyproj to_epsg) */
const API_EPSG_BY_PROJECTION: Record<string, string> = { GEOGCS: "4326", PROJCS: "2154" };

function readDataset(name: string): Record<string, Uint8Array<ArrayBuffer>> {
  const dir = new URL(`${name}/`, FIXTURES_DIR);
  return Object.fromEntries(
    readdirSync(dir).map((file) => [`${name}/${file}`, new Uint8Array(readFileSync(new URL(file, dir)))]),
  );
}

const asFileSet = (entries: Record<string, Uint8Array<ArrayBuffer>>): VirtualFileSet =>
  new Map(Object.entries(entries).map(([path, bytes]) => [path, memoryFile(bytes)]));

async function asZipFileSet(entries: Record<string, Uint8Array<ArrayBuffer>>): Promise<VirtualFileSet> {
  return openZipArchive(memoryFile(await buildZip(entries)), new AbortController().signal);
}

function context(): ParseContext {
  const resolveEpsg = vi.fn(async (wkt: string) => API_EPSG_BY_PROJECTION[wkt.slice(0, 6)] ?? null);
  return { signal: new AbortController().signal, onProgress: vi.fn(), resolveEpsg };
}

const FIELDS = [
  { name: "région", type: GeoFieldType.STRING, nativeType: "C" },
  { name: "pop", type: GeoFieldType.NUMBER, nativeType: "N" },
];

describe.each([
  ["plain files", async (name: string) => asFileSet(readDataset(name))],
  ["a ZIP archive", async (name: string) => asZipFileSet(readDataset(name))],
])("shapefileParser on GDAL output from %s", (_label, load) => {
  it("reads a latin1 point layer declared by its language driver", async () => {
    const [layer] = await shapefileParser.parse(await load("points_latin1"), context());

    expect(layer).toEqual({
      name: "points_latin1",
      geometryType: GeometryType.POINT,
      epsg: "4326",
      epsgSource: EpsgSource.DETECTED,
      fields: FIELDS,
      featureCount: 2,
      encoding: "ISO-8859-1",
      warnings: [],
    });
  });

  it("reads a UTF-8 line layer in Lambert 93", async () => {
    const [layer] = await shapefileParser.parse(await load("lines_utf8"), context());

    expect(layer).toMatchObject({
      geometryType: GeometryType.LINESTRING,
      epsg: "2154",
      fields: FIELDS,
      encoding: "UTF-8",
      warnings: [],
    });
  });
});
