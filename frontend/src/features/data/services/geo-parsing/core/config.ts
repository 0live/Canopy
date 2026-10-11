/**
 * Import limits, configurable at build time through VITE_* variables (see .env.example).
 * Unset or invalid values fall back to the defaults below.
 */
export interface GeoImportLimits {
  maxFileSizeBytes: number;
  zipMaxEntries: number;
  /** Archive-wide ratio: padded DBF text fields alone legitimately compress ~100x */
  zipMaxCompressionRatio: number;
  zipMaxUncompressedBytes: number;
}

export const GeoImportEnvVar = {
  MAX_FILE_SIZE_MB: "VITE_GEO_IMPORT_MAX_FILE_SIZE_MB",
  ZIP_MAX_ENTRIES: "VITE_GEO_IMPORT_ZIP_MAX_ENTRIES",
  ZIP_MAX_COMPRESSION_RATIO: "VITE_GEO_IMPORT_ZIP_MAX_COMPRESSION_RATIO",
  ZIP_MAX_UNCOMPRESSED_MB: "VITE_GEO_IMPORT_ZIP_MAX_UNCOMPRESSED_MB",
} as const;

type GeoImportEnvVar = (typeof GeoImportEnvVar)[keyof typeof GeoImportEnvVar];
type EnvSource = Partial<Record<string, string | boolean | undefined>>;

/** Sizes are expressed in MiB in the environment */
const MIB = 1024 * 1024;

const DEFAULTS: Record<GeoImportEnvVar, number> = {
  [GeoImportEnvVar.MAX_FILE_SIZE_MB]: 2048,
  [GeoImportEnvVar.ZIP_MAX_ENTRIES]: 1000,
  [GeoImportEnvVar.ZIP_MAX_COMPRESSION_RATIO]: 200,
  [GeoImportEnvVar.ZIP_MAX_UNCOMPRESSED_MB]: 8192,
};

function readPositive(env: EnvSource, name: GeoImportEnvVar): number {
  const raw = env[name];
  if (raw === undefined || raw === "") return DEFAULTS[name];
  const value = Number(raw);
  if (Number.isFinite(value) && value > 0) return value;
  console.warn(`[geo-import] invalid ${name}=${String(raw)}, using ${DEFAULTS[name]}`);
  return DEFAULTS[name];
}

export function loadGeoImportLimits(env: EnvSource): GeoImportLimits {
  return {
    maxFileSizeBytes: readPositive(env, GeoImportEnvVar.MAX_FILE_SIZE_MB) * MIB,
    zipMaxEntries: readPositive(env, GeoImportEnvVar.ZIP_MAX_ENTRIES),
    zipMaxCompressionRatio: readPositive(env, GeoImportEnvVar.ZIP_MAX_COMPRESSION_RATIO),
    zipMaxUncompressedBytes: readPositive(env, GeoImportEnvVar.ZIP_MAX_UNCOMPRESSED_MB) * MIB,
  };
}

export const GEO_IMPORT_LIMITS: GeoImportLimits = loadGeoImportLimits(import.meta.env);
