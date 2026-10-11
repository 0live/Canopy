import { WKTCRSLoader } from "@loaders.gl/wkt";
import { GEOJSON_DEFAULT_EPSG } from "@/features/data/services/geo-parsing/core/constants";
import { EpsgSource } from "@/features/data/services/geo-parsing/core/enums";
import {
  GeoParseError,
  GeoParseErrorCode,
  isAbortError,
} from "@/features/data/services/geo-parsing/core/errors";
import type { ParseContext } from "@/features/data/services/geo-parsing/core/types";

export interface EpsgResolution {
  epsg: string | null;
  source: EpsgSource;
}

const EPSG_AUTHORITY = "EPSG";
/** WKT1 uses AUTHORITY[...], WKT2 uses ID[...] */
const AUTHORITY_KEYWORDS: ReadonlySet<string> = new Set(["AUTHORITY", "ID"]);
const EPSG_CODE_PATTERN = /^\d+$/;
const NO_EPSG: EpsgResolution = { epsg: null, source: EpsgSource.NONE };

/** GeoJSON crs names: OGC URNs, OGC URLs and short "EPSG:xxxx" form */
const EPSG_NAME_PATTERNS = [
  /^urn:ogc:def:crs:EPSG:[\d.]*:(\d+)$/i,
  /^https?:\/\/www\.opengis\.net\/def\/crs\/EPSG\/[\d.]+\/(\d+)$/i,
  /^EPSG:(\d+)$/i,
];
/** CRS84 is WGS84 with lon/lat axis order, i.e. what PostGIS stores as 4326 */
const CRS84_PATTERN = /^(?:urn:ogc:def:crs:OGC:[\d.]*:|https?:\/\/www\.opengis\.net\/def\/crs\/OGC\/[\d.]+\/)?CRS84$/i;

type WktNode = unknown[];

function parseWktRoot(wkt: string): WktNode | null {
  try {
    const tree: unknown = WKTCRSLoader.parseTextSync(wkt, undefined);
    return Array.isArray(tree) && Array.isArray(tree[0]) ? tree[0] : null;
  } catch {
    return null;
  }
}

function isEpsgAuthority(node: unknown): node is WktNode {
  return (
    Array.isArray(node) &&
    AUTHORITY_KEYWORDS.has(String(node[0])) &&
    String(node[1]).toUpperCase() === EPSG_AUTHORITY &&
    EPSG_CODE_PATTERN.test(String(node[2]))
  );
}

/**
 * Reads the EPSG code of the CRS itself, i.e. the authority that is a direct child of
 * the root node. Nested authorities (ellipsoid, datum, unit) are deliberately ignored.
 */
export function extractEpsgFromWkt(wkt: string): string | null {
  if (!wkt.trim()) return null;
  const root = parseWktRoot(wkt);
  // Node layout: [KEYWORD, name, ...children]
  const authority = root?.slice(2).find(isEpsgAuthority);
  return authority ? String(authority[2]) : null;
}

/** resolveEpsg must return null for an unknown CRS and reject only when the API is unreachable */
async function detectEpsg(wkt: string, resolveEpsg: ParseContext["resolveEpsg"]): Promise<string | null> {
  try {
    const epsg = await resolveEpsg(wkt);
    return epsg && EPSG_CODE_PATTERN.test(epsg) ? epsg : null;
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new GeoParseError(GeoParseErrorCode.EPSG_SERVICE_UNAVAILABLE, {}, { cause: error });
  }
}

/** Local authority first, then the API for WKT without code (e.g. ESRI .prj) */
export async function resolveEpsgFromPrj(
  wkt: string,
  resolveEpsg: ParseContext["resolveEpsg"],
): Promise<EpsgResolution> {
  if (!wkt.trim()) return NO_EPSG;
  const declared = extractEpsgFromWkt(wkt);
  if (declared) return { epsg: declared, source: EpsgSource.DECLARED };
  const detected = await detectEpsg(wkt, resolveEpsg);
  return detected ? { epsg: detected, source: EpsgSource.DETECTED } : NO_EPSG;
}

function epsgFromCrsName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  if (CRS84_PATTERN.test(name)) return GEOJSON_DEFAULT_EPSG;
  for (const pattern of EPSG_NAME_PATTERNS) {
    const code = pattern.exec(name)?.[1];
    if (code) return code;
  }
  return null;
}

/** Reads a legacy GeoJSON (2008) crs member: named CRS or { type: "EPSG", code } */
export function fromGeoJsonCrsMember(crs: unknown): string | null {
  if (typeof crs !== "object" || crs === null) return null;
  const { type, properties } = crs as { type?: unknown; properties?: Record<string, unknown> };
  if (type === "name") return epsgFromCrsName(properties?.name);
  if (type === EPSG_AUTHORITY) return epsgFromCrsName(`${EPSG_AUTHORITY}:${properties?.code}`);
  return null;
}
