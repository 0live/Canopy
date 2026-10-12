import { GeoFormat } from "@/features/data/services/geo-parsing/core/enums";
import { findUploadFormat, UploadContainer } from "@/features/data/services/geo-parsing/extract/registry";

describe("findUploadFormat", () => {
  it.each([
    ["roads.ZIP", UploadContainer.ZIP, GeoFormat.SHAPEFILE],
    ["communes.geojson", UploadContainer.PLAIN, GeoFormat.GEOJSON],
    ["communes.json", UploadContainer.PLAIN, GeoFormat.GEOJSON],
  ])("%s is a %s %s", (fileName, container, format) => {
    expect(findUploadFormat(fileName)).toMatchObject({ container, parser: { format } });
  });

  it.each(["roads.shp", "map.kml", "zip", "toString"])("does not support %s", (fileName) => {
    expect(findUploadFormat(fileName)).toBeNull();
  });
});
