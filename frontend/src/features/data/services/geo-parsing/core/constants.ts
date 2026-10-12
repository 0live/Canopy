// Configurable limits (file size, zip bomb guards) live in core/config.ts

const KIB = 1024;
export const MIB = 1024 * KIB;

/** Size of each ranged read when streaming a file */
export const READ_CHUNK_BYTES = 64 * KIB;

/** Minimum delay between two progress reports sent by the parse worker */
export const PROGRESS_THROTTLE_MS = 100;

/** OS metadata entries skipped when listing an archive */
export const ZIP_IGNORED_PATH_PATTERNS: readonly RegExp[] = [/^__MACOSX\//, /(^|\/)\._/, /(^|\/)\.DS_Store$/];

/** Fixed size of the main file header of .shp and .shx files */
export const SHP_HEADER_SIZE = 100;

/** Each .shx record is an offset + a length, 4 bytes each */
export const SHX_RECORD_SIZE = 8;

/** DBF main header, followed by one descriptor per field */
export const DBF_HEADER_SIZE = 32;
export const DBF_FIELD_DESCRIPTOR_SIZE = 32;

/** Encoding assumed when neither .cpg nor DBF language driver declares one (GDAL default) */
export const SHAPEFILE_DEFAULT_ENCODING = "ISO-8859-1";

/** Upper bound for small text sidecars (.prj, .cpg): real ones are a few KiB at most */
export const SIDECAR_MAX_BYTES = 64 * KIB;

/** RFC 7946: GeoJSON coordinates are WGS84 when no crs member is given */
export const GEOJSON_DEFAULT_EPSG = "4326";

/** RFC 7946: GeoJSON text is always UTF-8 */
export const GEOJSON_ENCODING = "UTF-8";

/** Valid WGS84 longitude / latitude extent, in degrees */
export const WGS84_BOUNDS = { minX: -180, maxX: 180, minY: -90, maxY: 90 } as const;

/** Joins list values (missing components, field names) inside i18n message params */
export const MESSAGE_LIST_SEPARATOR = ", ";
