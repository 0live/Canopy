import { extensionOf, fileStemOf } from "@/features/data/services/geo-parsing/core/paths";

describe("extensionOf", () => {
  it.each([
    ["roads.SHP", "shp"],
    ["data/roads.v2.geojson", "geojson"],
    ["geojson", ""],
    ["data.d/roads", ""],
  ])("%s → %j", (path, expected) => {
    expect(extensionOf(path)).toBe(expected);
  });
});

describe("fileStemOf", () => {
  it.each([
    ["data/Routes.shp", "Routes"],
    ["communes.v2.geojson", "communes.v2"],
    ["data.d/README", "README"],
  ])("%s → %s", (path, expected) => {
    expect(fileStemOf(path)).toBe(expected);
  });
});
