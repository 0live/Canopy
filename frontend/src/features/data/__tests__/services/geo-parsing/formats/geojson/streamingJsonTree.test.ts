import { GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import { StreamingJsonTree } from "@/features/data/services/geo-parsing/formats/geojson/streamingJsonTree";
import { thrownBy } from "@/features/data/__tests__/services/geo-parsing/helpers/errors";
import { collection, feature, namedCrs, point } from "@/features/data/__tests__/services/geo-parsing/helpers/geojsonFixtures";

/** Feeds the text in chunks of `size` characters and collects every streamed feature */
function streamAll(text: string, size = text.length) {
  const tree = new StreamingJsonTree();
  const features: unknown[] = [];
  for (let start = 0; start < text.length; start += size) features.push(...tree.write(text.slice(start, start + size)));
  features.push(...tree.end());
  return { root: tree.root, features };
}

describe("StreamingJsonTree", () => {
  const FEATURES = [feature(point(1, 2), { name: "a", tags: [1, { deep: true }] }), feature(null, null)];
  const TEXT = collection(FEATURES, { ...namedCrs("EPSG:2154"), bbox: [0, 0, 1, 1] });

  it.each([1, 7, 64, TEXT.length])("streams features and keeps root members with chunks of %i chars", (size) => {
    const { root, features } = streamAll(TEXT, size);

    expect(features).toEqual(FEATURES);
    expect(root).toEqual({ type: "FeatureCollection", features: [], ...namedCrs("EPSG:2154"), bbox: [0, 0, 1, 1] });
  });

  it("returns completed features as soon as their chunk is written", () => {
    const tree = new StreamingJsonTree();
    const firstFeatureEnd = TEXT.indexOf("},{") + 1;

    expect(tree.write(TEXT.slice(0, firstFeatureEnd + 1))).toEqual([FEATURES[0]]);
  });

  it("does not stream a features array nested below the root", () => {
    const text = JSON.stringify(feature(point(1, 2), { features: [1, 2] }));

    expect(streamAll(text)).toEqual({ root: JSON.parse(text), features: [] });
  });

  it("keeps a __proto__ key as a plain property", () => {
    const { features } = streamAll(collection([feature(null, JSON.parse('{"__proto__": {"x": 1}}'))]));
    const properties = (features[0] as { properties: object }).properties;

    expect(Object.getPrototypeOf(properties)).toBe(Object.prototype);
    expect(Object.keys(properties)).toEqual(["__proto__"]);
  });

  it.each([
    ["truncated after a feature", TEXT.slice(0, TEXT.indexOf("},{") + 2)],
    ["truncated inside a string", TEXT.slice(0, 50)],
    ["invalid syntax", '{"type": FeatureCollection}'],
    ["empty text", ""],
  ])("fails on %s", (_label, text) => {
    expect(() => streamAll(text)).toThrow();
  });

  it("refuses a root array without buffering it", () => {
    expect(thrownBy(() => new StreamingJsonTree().write("[{")).code).toBe(GeoParseErrorCode.UNSUPPORTED_FORMAT);
  });
});
