import { ExtraDimension, GeometryType } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import { Extent, scanGeometry } from "@/features/data/services/geo-parsing/formats/geojson/geometryScan";
import { thrownBy } from "@/features/data/__tests__/services/geo-parsing/helpers/errors";

const FEATURE = 7;
const scan = (geometry: unknown, extent = new Extent()) => scanGeometry(geometry, FEATURE, extent);
const geometry = (type: string, coordinates: unknown) => ({ type, coordinates });

describe("scanGeometry", () => {
  it.each([
    [geometry("Point", [1, 2]), GeometryType.POINT],
    [geometry("LineString", [[1, 2], [3, 4]]), GeometryType.LINESTRING],
    [geometry("MultiPoint", [[1, 2]]), GeometryType.MULTIPOINT],
    [geometry("Polygon", [[[0, 0], [1, 0], [1, 1], [0, 0]]]), GeometryType.POLYGON],
    [geometry("MultiLineString", [[[1, 2], [3, 4]]]), GeometryType.MULTILINESTRING],
    [geometry("MultiPolygon", [[[[0, 0], [1, 0], [1, 1], [0, 0]]]]), GeometryType.MULTIPOLYGON],
    [geometry("MultiPolygon", []), GeometryType.MULTIPOLYGON],
    [{ type: "GeometryCollection", geometries: [] }, GeometryType.MIXED],
  ])("returns the type of %j", (input, expected) => {
    expect(scan(input)).toBe(expected);
  });

  it.each([null, undefined])("returns null for a %s geometry", (input) => {
    expect(scan(input)).toBeNull();
  });

  it("grows the extent with every position", () => {
    const extent = new Extent();
    scan(geometry("LineString", [[-5, 10], [3, -20]]), extent);
    scan(geometry("Point", [8, 1]), extent);

    expect(extent).toMatchObject({ minX: -5, maxX: 8, minY: -20, maxY: 10 });
  });

  it.each([
    [[1, 2, 0], ExtraDimension.Z],
    [[1, 2, 3, 4], ExtraDimension.ZM],
  ])("refuses the position %j even when Z is 0", (position, dimension) => {
    expect(thrownBy(() => scan(geometry("LineString", [[1, 2], position])))).toMatchObject({
      code: GeoParseErrorCode.UNSUPPORTED_DIMENSIONS,
      params: { dimension, feature: FEATURE },
    });
  });

  it.each([
    ["an unknown type", geometry("Circle", [1, 2])],
    ["a lower-case type", geometry("point", [1, 2])],
    ["missing coordinates", { type: "Point" }],
    ["an empty Point", geometry("Point", [])],
    ["a one-value position", geometry("Point", [1])],
    ["a text coordinate", geometry("Point", ["1", 2])],
    ["a non-finite coordinate", geometry("Point", [1, null])],
    ["a too shallow nesting", geometry("Polygon", [[0, 0], [1, 1]])],
    ["a non-object geometry", [1, 2]],
  ])("refuses %s as corrupted, with the feature number", (_label, input) => {
    expect(thrownBy(() => scan(input))).toMatchObject({
      code: GeoParseErrorCode.CORRUPTED,
      params: { feature: FEATURE },
    });
  });
});

describe("Extent.isWithin", () => {
  const BOUNDS = { minX: -180, maxX: 180, minY: -90, maxY: 90 };

  it("accepts an empty extent", () => {
    expect(new Extent().isWithin(BOUNDS)).toBe(true);
  });

  it.each([
    [[180, 90], true],
    [[-180, -90], true],
    [[180.5, 0], false],
    [[0, -90.1], false],
    [[652_000, 6_862_000], false],
  ])("checks %j", ([x, y], expected) => {
    const extent = new Extent();
    extent.add(x, y);

    expect(extent.isWithin(BOUNDS)).toBe(expected);
  });
});
