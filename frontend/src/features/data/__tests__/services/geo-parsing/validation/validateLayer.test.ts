import {
  EpsgSource,
  GeoLayerIssueCode,
  GeoLayerProperty,
  GeometryType,
  GeoWarningCode,
} from "@/features/data/services/geo-parsing/core/enums";
import type { GeoFileMetadata, GeoLayerMetadata } from "@/features/data/services/geo-parsing/core/types";
import { isImportable, validateLayer } from "@/features/data/services/geo-parsing/validation/validateLayer";

const VALID_LAYER: GeoLayerMetadata = {
  name: "roads",
  geometryType: GeometryType.LINESTRING,
  epsg: "2154",
  epsgSource: EpsgSource.DETECTED,
  fields: [],
  featureCount: 3,
  encoding: "UTF-8",
  warnings: [{ code: GeoWarningCode.NO_FIELDS }],
};

const layer = (overrides: Partial<GeoLayerMetadata>) => ({ ...VALID_LAYER, ...overrides });
const fileWith = (...layers: GeoLayerMetadata[]): GeoFileMetadata => ({
  fileName: "roads.zip",
  fileSize: 10,
  format: "shapefile",
  layers,
  parseTimeMs: 1,
});

describe("validateLayer", () => {
  it("accepts a layer without fields: it is only a warning", () => {
    expect(validateLayer(VALID_LAYER)).toEqual([]);
  });

  it.each([
    [GeometryType.UNKNOWN, GeoLayerIssueCode.GEOMETRY_UNKNOWN],
    [GeometryType.MIXED, GeoLayerIssueCode.GEOMETRY_MIXED],
  ])("blocks a %s geometry", (geometryType, code) => {
    expect(validateLayer(layer({ geometryType }))).toEqual([{ code, property: GeoLayerProperty.GEOMETRY_TYPE }]);
  });

  it("blocks a layer without EPSG", () => {
    expect(validateLayer(layer({ epsg: null, epsgSource: EpsgSource.NONE }))).toEqual([
      { code: GeoLayerIssueCode.EPSG_NOT_FOUND, property: GeoLayerProperty.EPSG },
    ]);
  });

  it("reports every issue at once", () => {
    expect(validateLayer(layer({ geometryType: GeometryType.MIXED, epsg: null }))).toHaveLength(2);
  });
});

describe("isImportable", () => {
  it.each([
    ["a valid layer", fileWith(VALID_LAYER), true],
    ["a layer with an issue", fileWith(VALID_LAYER, layer({ epsg: null })), false],
    ["no layer at all", fileWith(), false],
  ])("%s → %s", (_label, metadata, expected) => {
    expect(isImportable(metadata)).toBe(expected);
  });
});
