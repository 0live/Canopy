const KIB = 1024;
const MIB = 1024 * KIB;
const GIB = 1024 * MIB;

/** Largest file accepted for inspection (only headers are read, not the whole file) */
export const MAX_FILE_SIZE_BYTES = 2 * GIB;

/** Size of each ranged read when streaming a file */
export const READ_CHUNK_BYTES = 64 * KIB;

// Zip bomb guards, checked on the central directory before any entry is read
export const ZIP_MAX_ENTRIES = 1000;
/** Archive-wide ratio: padded DBF text fields alone legitimately compress ~100x */
export const ZIP_MAX_COMPRESSION_RATIO = 200;
export const ZIP_MAX_UNCOMPRESSED_BYTES = 8 * GIB;
/** OS metadata entries skipped when listing an archive */
export const ZIP_IGNORED_PATH_PATTERNS: readonly RegExp[] = [/^__MACOSX\//, /(^|\/)\._/, /(^|\/)\.DS_Store$/];

/** Fixed size of the main file header of .shp and .shx files */
export const SHP_HEADER_SIZE = 100;

/** DBF prefix parsed to get the typed field schema (header + first records) */
export const DBF_PREFIX_BYTES = 64 * KIB;

/** Features per batch when streaming a GeoJSON file */
export const GEOJSON_BATCH_SIZE = 1000;

/** GeoJSON prefix scanned for a "crs" member declared before "features" */
export const CRS_SCAN_PREFIX_BYTES = 4 * KIB;

/** RFC 7946: GeoJSON coordinates are WGS84 when no crs member is given */
export const GEOJSON_DEFAULT_EPSG = "4326";
