import {
  GeoParseError,
  GeoParseErrorCode,
  isAbortError,
  toGeoParseError,
} from "@/features/data/services/geo-parsing/core/errors";

describe("GeoParseError", () => {
  it("carries code and params", () => {
    const error = new GeoParseError(GeoParseErrorCode.MISSING_COMPONENT, { component: "dbf" });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("GeoParseError");
    expect(error.code).toBe(GeoParseErrorCode.MISSING_COMPONENT);
    expect(error.params).toEqual({ component: "dbf" });
  });

  it("defaults params to an empty object", () => {
    expect(new GeoParseError(GeoParseErrorCode.EMPTY).params).toEqual({});
  });
});

describe("isAbortError", () => {
  it.each([
    ["DOMException AbortError", new DOMException("stop", "AbortError"), true],
    ["default AbortSignal reason", AbortSignal.abort().reason, true],
    ["plain Error", new Error("boom"), false],
    ["other DOMException", new DOMException("x", "NotFoundError"), false],
    ["string", "AbortError", false],
    ["null", null, false],
  ])("%s → %s", (_label, value, expected) => {
    expect(isAbortError(value)).toBe(expected);
  });
});

describe("toGeoParseError", () => {
  it("returns a GeoParseError unchanged", () => {
    const original = new GeoParseError(GeoParseErrorCode.TOO_LARGE, { maxBytes: 1 });

    expect(toGeoParseError(original)).toBe(original);
  });

  it("maps an abort to ABORTED", () => {
    const error = toGeoParseError(new DOMException("stop", "AbortError"));

    expect(error.code).toBe(GeoParseErrorCode.ABORTED);
  });

  it.each([
    ["Error", new Error("unexpected byte")],
    ["TypeError", new TypeError("cannot read")],
    ["thrown string", "boom"],
    ["undefined", undefined],
  ])("maps an unknown %s to CORRUPTED and keeps it as cause", (_label, thrown) => {
    const error = toGeoParseError(thrown);

    expect(error.code).toBe(GeoParseErrorCode.CORRUPTED);
    expect(error.cause).toBe(thrown);
  });
});
