import { SHAPEFILE_DEFAULT_ENCODING } from "@/features/data/services/geo-parsing/core/constants";
import { GeoWarningCode } from "@/features/data/services/geo-parsing/core/enums";
import type { GeoLayerWarning } from "@/features/data/services/geo-parsing/core/types";

export interface EncodingResolution {
  /** GDAL encoding name (e.g. "UTF-8", "CP1252", "ISO-8859-1") */
  encoding: string;
  warnings: GeoLayerWarning[];
}

const UTF8 = "UTF-8";
const UTF8_CODE_PAGE = "65001";
/** GDAL reads "88591" as ISO-8859-1 */
const ISO_8859_CODE_PAGE_PREFIX = "8859";
const UTF8_PATTERN = /^UTF-?8$/i;
const ISO_8859_PATTERN = /^ISO[\s_-]*8859[\s_-]*(\d+)$/i;
/** "1252", "CP1252", "ANSI 1252" */
const CODE_PAGE_PATTERN = /^(?:ANSI|CP)?[\s_-]*(\d+)$/i;
/** Decoder for encodings the browser does not know (e.g. CP850): field names are almost always ASCII */
const FALLBACK_DECODER_LABEL = "latin1";

/** DBF language driver IDs, same mapping as GDAL 3.8 (checked against all 255 values) */
const LDID_GROUPS: Readonly<Record<string, readonly number[]>> = {
  CP437: [1, 11, 13, 15, 17, 21, 24, 25, 27],
  CP850: [2, 10, 14, 16, 18, 20, 22, 26, 29, 37, 55],
  CP1252: [3, 88, 89],
  CP10000: [4],
  CP865: [8, 23, 102],
  CP932: [19, 123],
  CP863: [28, 108],
  CP852: [31, 34, 35, 64, 100, 135],
  CP860: [36],
  CP866: [38, 101],
  CP936: [77, 122],
  CP949: [78, 121],
  CP950: [79, 120],
  CP874: [80, 124],
  "ISO-8859-1": [87],
  CP861: [103],
  CP895: [104],
  CP620: [105],
  CP737: [106, 134],
  CP857: [107, 136],
  CP10007: [150],
  CP10029: [151],
  CP1250: [200],
  CP1251: [201],
  CP1254: [202],
  CP1253: [203],
  CP1257: [204],
};

const LDID_ENCODINGS: ReadonlyMap<number, string> = new Map(
  Object.entries(LDID_GROUPS).flatMap(([encoding, ids]) => ids.map((id) => [id, encoding] as const)),
);

/** Code pages whose WHATWG label differs from "cpNNN" */
const WHATWG_LABELS: Readonly<Record<string, string>> = {
  CP874: "windows-874",
  CP932: "shift_jis",
  CP949: "euc-kr",
  CP950: "big5",
  CP10000: "macintosh",
  CP10007: "x-mac-cyrillic",
};

function isDecoderLabel(label: string): boolean {
  try {
    new TextDecoder(label);
    return true;
  } catch {
    return false;
  }
}

function fromCodePage(code: string): string {
  if (code === UTF8_CODE_PAGE) return UTF8;
  if (code.startsWith(ISO_8859_CODE_PAGE_PREFIX) && code.length > ISO_8859_CODE_PAGE_PREFIX.length) {
    return `ISO-8859-${code.slice(ISO_8859_CODE_PAGE_PREFIX.length)}`;
  }
  return `CP${code}`;
}

/** Reads a .cpg content; null when it names no recognizable encoding */
export function fromCpg(content: string): string | null {
  const value = content.trim();
  if (!value) return null;
  if (UTF8_PATTERN.test(value)) return UTF8;
  const iso = ISO_8859_PATTERN.exec(value)?.[1];
  if (iso) return `ISO-8859-${iso}`;
  const codePage = CODE_PAGE_PATTERN.exec(value)?.[1];
  if (codePage) return fromCodePage(codePage);
  return isDecoderLabel(value) ? value : null;
}

/** .cpg first, then the DBF language driver, else the GDAL default with a warning */
export function resolveShapefileEncoding(cpg: string | null, languageDriverId: number): EncodingResolution {
  const declared = (cpg === null ? null : fromCpg(cpg)) ?? LDID_ENCODINGS.get(languageDriverId);
  if (declared) return { encoding: declared, warnings: [] };
  return {
    encoding: SHAPEFILE_DEFAULT_ENCODING,
    warnings: [{ code: GeoWarningCode.ENCODING_ASSUMED, params: { encoding: SHAPEFILE_DEFAULT_ENCODING } }],
  };
}

export function textDecoderFor(encoding: string): TextDecoder {
  const label = WHATWG_LABELS[encoding.toUpperCase()] ?? encoding;
  return isDecoderLabel(label) ? new TextDecoder(label) : new TextDecoder(FALLBACK_DECODER_LABEL);
}
