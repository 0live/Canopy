import { GeoFormat } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError } from "@/features/data/services/geo-parsing/core/errors";
import type { GeoFormatParser, ParseContext } from "@/features/data/services/geo-parsing/core/types";
import { geojsonParser } from "@/features/data/services/geo-parsing/formats/geojson/geojsonParser";
import { shapefileParser } from "@/features/data/services/geo-parsing/formats/shapefile/shapefileParser";
import { memoryFile } from "@/features/data/__tests__/services/geo-parsing/helpers/files";

const context = (signal = new AbortController().signal): ParseContext => ({
  signal,
  onProgress: vi.fn(),
  resolveEpsg: vi.fn().mockResolvedValue(null),
});

/** Every plugin must honour these rules, so the orchestrator can treat them alike */
describe.each<[string, GeoFormatParser]>([
  ["shapefile", shapefileParser],
  ["geojson", geojsonParser],
])("%s parser contract", (_name, parser) => {
  const garbageSet = () => new Map(parser.extensions.map((extension) => [`x.${extension}`, memoryFile("garbage")]));

  it("declares a known format and lower-case extensions without dot", () => {
    expect(Object.values(GeoFormat)).toContain(parser.format);
    expect(parser.extensions.length).toBeGreaterThan(0);
    parser.extensions.forEach((extension) => expect(extension).toMatch(/^[a-z0-9]+$/));
  });

  it("recognizes its own extensions only", () => {
    expect(parser.canParse(garbageSet())).toBe(true);
    expect(parser.canParse(new Map([["x.txt", memoryFile("")]]))).toBe(false);
    expect(parser.canParse(new Map())).toBe(false);
  });

  it("rejects invalid content with a GeoParseError", async () => {
    await expect(parser.parse(garbageSet(), context())).rejects.toBeInstanceOf(GeoParseError);
  });

  it("rejects with an AbortError when already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(parser.parse(garbageSet(), context(controller.signal))).rejects.toMatchObject({ name: "AbortError" });
  });
});
