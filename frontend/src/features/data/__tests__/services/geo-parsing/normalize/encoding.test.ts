import { GeoWarningCode } from "@/features/data/services/geo-parsing/core/enums";
import {
  fromCpg,
  resolveShapefileEncoding,
  textDecoderFor,
} from "@/features/data/services/geo-parsing/normalize/encoding";

const NO_LDID = 0;

describe("fromCpg", () => {
  it.each([
    ["UTF-8", "UTF-8"],
    ["utf8\r\n", "UTF-8"],
    ["65001", "UTF-8"],
    ["1252", "CP1252"],
    ["ANSI 1251", "CP1251"],
    ["CP850", "CP850"],
    ["88591", "ISO-8859-1"],
    ["ISO 88591", "ISO-8859-1"],
    ["ISO-8859-15", "ISO-8859-15"],
    ["latin1", "latin1"],
    ["koi8-r", "koi8-r"],
  ])("%j → %s", (content, expected) => {
    expect(fromCpg(content)).toBe(expected);
  });

  it.each(["", "  ", "foo"])("returns null for %j", (content) => {
    expect(fromCpg(content)).toBeNull();
  });
});

describe("resolveShapefileEncoding", () => {
  // Expected values come from GDAL 3.8 (SOURCE_ENCODING layer metadata)
  it.each([
    [87, "ISO-8859-1"],
    [3, "CP1252"],
    [1, "CP437"],
    [2, "CP850"],
    [200, "CP1250"],
    [123, "CP932"],
  ])("maps language driver %i to %s", (ldid, expected) => {
    expect(resolveShapefileEncoding(null, ldid)).toEqual({ encoding: expected, warnings: [] });
  });

  it("prefers the .cpg over the language driver", () => {
    expect(resolveShapefileEncoding("UTF-8", 87).encoding).toBe("UTF-8");
  });

  it("falls back to the language driver when the .cpg is unreadable", () => {
    expect(resolveShapefileEncoding("foo", 3).encoding).toBe("CP1252");
  });

  it.each([
    ["no .cpg and no language driver", null, NO_LDID],
    ["an unknown language driver", null, 250],
    ["an unreadable .cpg", "foo", NO_LDID],
  ])("assumes ISO-8859-1 with a warning for %s", (_label, cpg, ldid) => {
    expect(resolveShapefileEncoding(cpg, ldid)).toEqual({
      encoding: "ISO-8859-1",
      warnings: [{ code: GeoWarningCode.ENCODING_ASSUMED, params: { encoding: "ISO-8859-1" } }],
    });
  });
});

describe("textDecoderFor", () => {
  const bytes = (...values: number[]) => new Uint8Array(values);

  it.each([
    ["UTF-8", bytes(0xc3, 0xa9), "é"],
    ["ISO-8859-1", bytes(0xe9), "é"],
    // CP1250 rather than CP1252: Node 22 decodes windows-1252 as latin1, browsers do not
    ["CP1250", bytes(0x8a), "Š"],
    ["CP1251", bytes(0xc4), "Д"],
    ["CP932", bytes(0x82, 0xa0), "あ"],
  ])("decodes %s", (encoding, input, expected) => {
    expect(textDecoderFor(encoding).decode(input)).toBe(expected);
  });

  it("falls back to latin1 for encodings the browser cannot decode", () => {
    expect(textDecoderFor("CP850").decode(bytes(0x41, 0x42))).toBe("AB");
  });
});
