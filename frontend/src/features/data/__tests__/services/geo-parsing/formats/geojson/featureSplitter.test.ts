import { GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import { FeatureSplitter } from "@/features/data/services/geo-parsing/formats/geojson/featureSplitter";
import { thrownBy } from "@/features/data/__tests__/services/geo-parsing/helpers/errors";
import { collection, feature, namedCrs, point } from "@/features/data/__tests__/services/geo-parsing/helpers/geojsonFixtures";

/** Feeds the text in chunks of `size` characters, parses every split feature and the root */
function splitAll(text: string, size = Math.max(text.length, 1)) {
  const splitter = new FeatureSplitter();
  const features: unknown[] = [];
  for (let start = 0; start < text.length; start += size) {
    features.push(...splitter.write(text.slice(start, start + size)).map((raw) => JSON.parse(raw)));
  }
  return { root: splitter.end(), features };
}

describe("FeatureSplitter", () => {
  const FEATURES = [
    feature(point(1, 2), { name: 'a "quoted" {brace} [bracket], comma\\', tags: [1, { deep: true }] }),
    feature(null, null),
  ];
  const TEXT = collection(FEATURES, { ...namedCrs("EPSG:2154"), bbox: [0, 0, 1, 1] });

  it.each([1, 7, 64, TEXT.length])("splits features and keeps root members with chunks of %i chars", (size) => {
    expect(splitAll(TEXT, size)).toEqual({
      root: { type: "FeatureCollection", features: [], ...namedCrs("EPSG:2154"), bbox: [0, 0, 1, 1] },
      features: FEATURES,
    });
  });

  it("tolerates whitespace around features", () => {
    const text = '{ "type" : "FeatureCollection" , "features" :\n [\n {"type":"Feature"} ,\n {"type":"Feature"}\n ]\n}\n';

    expect(splitAll(text, 3).features).toHaveLength(2);
  });

  it("returns completed features as soon as their chunk is written", () => {
    const firstFeatureEnd = TEXT.indexOf("},{") + 1;

    expect(new FeatureSplitter().write(TEXT.slice(0, firstFeatureEnd + 1))).toHaveLength(1);
  });

  it.each([
    ["a features array nested below the root", JSON.stringify(feature(point(1, 2), { features: [1, 2] }))],
    ["a root member that only looks like features", '{"type":"FeatureCollection","features":[],"x":{"features":[1]}}'],
  ])("does not split %s", (_label, text) => {
    expect(splitAll(text)).toEqual({ root: JSON.parse(text), features: [] });
  });

  it.each([
    ["truncated after a feature", TEXT.slice(0, TEXT.indexOf("},{") + 2)],
    ["truncated inside a string", TEXT.slice(0, 60)],
    ["an empty text", ""],
    ["invalid root syntax", '{"type": FeatureCollection, "features": []}'],
    ["a leading comma", '{"features":[,{}]}'],
    ["a trailing comma", '{"features":[{},]}'],
    ["mismatched brackets", '{"features":[{}}'],
    ["trailing garbage", '{"features":[]} x'],
    ["an extra closing brace", '{"features":[]}}'],
  ])("refuses %s as corrupted", (_label, text) => {
    expect(thrownBy(() => splitAll(text)).code).toBe(GeoParseErrorCode.CORRUPTED);
  });

  it("refuses a root array without buffering it", () => {
    expect(thrownBy(() => new FeatureSplitter().write("[")).code).toBe(GeoParseErrorCode.UNSUPPORTED_FORMAT);
  });
});
