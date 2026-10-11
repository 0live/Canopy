import { readdirSync, readFileSync } from "node:fs";
import { EpsgSource } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import {
  extractEpsgFromWkt,
  fromGeoJsonCrsMember,
  resolveEpsgFromPrj,
} from "@/features/data/services/geo-parsing/normalize/crs";

const PRJ_DIR = new URL("../fixtures/prj/", import.meta.url);
/** File names are "<epsg>_<flavour>.prj", flavour being esri, gdal or wkt2 */
const PRJ_FIXTURES = readdirSync(PRJ_DIR)
  .filter((name) => name.endsWith(".prj"))
  .map((name) => {
    const [epsg, flavour] = name.replace(".prj", "").split("_");
    return { name, epsg, flavour, wkt: readFileSync(new URL(name, PRJ_DIR), "utf8") };
  });
const WITH_AUTHORITY = PRJ_FIXTURES.filter(({ flavour }) => flavour !== "esri");
const ESRI = PRJ_FIXTURES.filter(({ flavour }) => flavour === "esri");

describe("extractEpsgFromWkt", () => {
  it("covers every generated fixture", () => {
    expect(WITH_AUTHORITY).toHaveLength(4);
    expect(ESRI).toHaveLength(2);
  });

  // Regression: the former regex returned the ellipsoid code (7019, 7030) for GDAL WKT1
  it.each(WITH_AUTHORITY)("reads the CRS code of $name, not a nested one", ({ wkt, epsg }) => {
    expect(extractEpsgFromWkt(wkt)).toBe(epsg);
  });

  it.each(ESRI)("returns null for $name, which carries no authority", ({ wkt }) => {
    expect(extractEpsgFromWkt(wkt)).toBeNull();
  });

  it.each([
    ["empty", ""],
    ["blank", "  \n"],
    ["not WKT", "garbage"],
    ["truncated", 'PROJCS["x",GEOGCS["y"'],
    ["non EPSG authority", 'PROJCS["x",ID["ESRI",102110]]'],
    ["non numeric code", 'GEOGCS["x",AUTHORITY["EPSG","abc"]]'],
  ])("returns null for %s WKT", (_label, wkt) => {
    expect(extractEpsgFromWkt(wkt)).toBeNull();
  });
});

describe("resolveEpsgFromPrj", () => {
  it("uses the declared code without calling the API", async () => {
    const resolveEpsg = vi.fn();
    const { wkt } = WITH_AUTHORITY[0];

    const result = await resolveEpsgFromPrj(wkt, resolveEpsg);

    expect(result).toEqual({ epsg: WITH_AUTHORITY[0].epsg, source: EpsgSource.DECLARED });
    expect(resolveEpsg).not.toHaveBeenCalled();
  });

  it.each(ESRI)("asks the API for $name", async ({ wkt, epsg }) => {
    const resolveEpsg = vi.fn().mockResolvedValue(epsg);

    const result = await resolveEpsgFromPrj(wkt, resolveEpsg);

    expect(resolveEpsg).toHaveBeenCalledWith(wkt);
    expect(result).toEqual({ epsg, source: EpsgSource.DETECTED });
  });

  it.each([
    ["the API finds nothing", vi.fn().mockResolvedValue(null)],
    ["the API answers garbage", vi.fn().mockResolvedValue("EPSG:abc")],
  ])("has no EPSG when %s", async (_label, resolveEpsg) => {
    expect(await resolveEpsgFromPrj(ESRI[0].wkt, resolveEpsg)).toEqual({
      epsg: null,
      source: EpsgSource.NONE,
    });
  });

  it("fails with a dedicated error when the API is unreachable", async () => {
    const networkError = new Error("Network Error");
    const resolveEpsg = vi.fn().mockRejectedValue(networkError);

    await expect(resolveEpsgFromPrj(ESRI[0].wkt, resolveEpsg)).rejects.toMatchObject({
      code: GeoParseErrorCode.EPSG_SERVICE_UNAVAILABLE,
      cause: networkError,
    });
  });

  it("does not call the API for an empty .prj", async () => {
    const resolveEpsg = vi.fn();

    expect((await resolveEpsgFromPrj(" ", resolveEpsg)).source).toBe(EpsgSource.NONE);
    expect(resolveEpsg).not.toHaveBeenCalled();
  });

  it("propagates a cancellation", async () => {
    const resolveEpsg = vi.fn().mockRejectedValue(new DOMException("stop", "AbortError"));

    await expect(resolveEpsgFromPrj(ESRI[0].wkt, resolveEpsg)).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});

describe("fromGeoJsonCrsMember", () => {
  const named = (name: unknown) => ({ type: "name", properties: { name } });

  it.each([
    ["OGC URN", named("urn:ogc:def:crs:EPSG::2154"), "2154"],
    ["versioned OGC URN", named("urn:ogc:def:crs:EPSG:6.3:3946"), "3946"],
    ["short form", named("EPSG:3857"), "3857"],
    ["OGC URL", named("http://www.opengis.net/def/crs/EPSG/0/2154"), "2154"],
    ["CRS84 URN", named("urn:ogc:def:crs:OGC:1.3:CRS84"), "4326"],
    ["CRS84 URL", named("http://www.opengis.net/def/crs/OGC/1.3/CRS84"), "4326"],
    ["legacy EPSG member", { type: "EPSG", properties: { code: 2154 } }, "2154"],
    ["unknown name", named("urn:ogc:def:crs:ESRI::102110"), null],
    ["non string name", named(2154), null],
    ["link CRS", { type: "link", properties: { href: "x.prj" } }, null],
    ["missing properties", { type: "name" }, null],
    ["null", null, null],
    ["string", "EPSG:2154", null],
  ])("%s → %s", (_label, crs, expected) => {
    expect(fromGeoJsonCrsMember(crs)).toBe(expected);
  });
});
