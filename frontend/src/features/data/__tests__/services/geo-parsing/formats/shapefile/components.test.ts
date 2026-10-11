import { GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import { findShapefileComponents } from "@/features/data/services/geo-parsing/formats/shapefile/components";
import { thrownBy } from "@/features/data/__tests__/services/geo-parsing/helpers/errors";
import {
  type ShapefileEntries,
  toFileSet,
  validShapefileEntries,
} from "@/features/data/__tests__/services/geo-parsing/helpers/shapefileFixtures";

function withoutKeys(entries: ShapefileEntries, ...keys: string[]): ShapefileEntries {
  return Object.fromEntries(Object.entries(entries).filter(([key]) => !keys.includes(key)));
}

describe("findShapefileComponents", () => {
  it("finds the sidecars of a dataset nested in a folder", () => {
    const files = toFileSet(validShapefileEntries("data/Routes"));

    const components = findShapefileComponents(files);

    expect(components.name).toBe("Routes");
    expect(components.shp).toBe(files.get("data/Routes.shp"));
    expect(components.prj).toBe(files.get("data/Routes.prj"));
    expect(components.cpg).toBeNull();
  });

  it("matches extensions and names case-insensitively", () => {
    const { "roads.shp": shp, "roads.shx": shx, "roads.dbf": dbf, "roads.prj": prj } = validShapefileEntries();
    const files = toFileSet({ "ROADS.SHP": shp, "Roads.Shx": shx, "roads.DBF": dbf, "roads.prj": prj, "ROADS.cpg": "UTF-8" });

    expect(findShapefileComponents(files)).toMatchObject({ name: "ROADS", dbf: files.get("roads.DBF"), cpg: files.get("ROADS.cpg") });
  });

  it("ignores files of other datasets", () => {
    const files = toFileSet({ ...validShapefileEntries(), "rivers.dbf": "", "readme.txt": "" });

    expect(findShapefileComponents(files).dbf).toBe(files.get("roads.dbf"));
  });

  it("does not pair sidecars from another folder", () => {
    const entries = validShapefileEntries("a/roads");
    const files = toFileSet({ ...withoutKeys(entries, "a/roads.prj"), "b/roads.prj": "" });

    expect(thrownBy(() => findShapefileComponents(files))).toMatchObject({
      code: GeoParseErrorCode.MISSING_COMPONENT,
      params: { components: ".prj" },
    });
  });

  it.each([
    [["roads.shx"], ".shx"],
    [["roads.dbf"], ".dbf"],
    [["roads.prj"], ".prj"],
    [["roads.shx", "roads.dbf", "roads.prj"], ".shx, .dbf, .prj"],
  ])("refuses a dataset without %j", (removed, components) => {
    const files = toFileSet(withoutKeys(validShapefileEntries(), ...removed));

    expect(thrownBy(() => findShapefileComponents(files))).toMatchObject({
      code: GeoParseErrorCode.MISSING_COMPONENT,
      params: { components },
    });
  });

  it("refuses several datasets", () => {
    const files = toFileSet({ ...validShapefileEntries("roads"), ...validShapefileEntries("rivers") });

    expect(thrownBy(() => findShapefileComponents(files))).toMatchObject({
      code: GeoParseErrorCode.MULTIPLE_LAYERS,
      params: { count: 2 },
    });
  });

  it("reports an unsupported format without .shp", () => {
    const files = toFileSet(withoutKeys(validShapefileEntries(), "roads.shp"));

    expect(thrownBy(() => findShapefileComponents(files)).code).toBe(GeoParseErrorCode.UNSUPPORTED_FORMAT);
  });
});
