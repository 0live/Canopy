/// <reference types="vite/client" />

// Build-time variables (see .env.example). Values are strings; parsing and defaults live in the consuming module.
interface ImportMetaEnv {
  readonly VITE_GEO_IMPORT_MAX_FILE_SIZE_MB?: string;
  readonly VITE_GEO_IMPORT_ZIP_MAX_ENTRIES?: string;
  readonly VITE_GEO_IMPORT_ZIP_MAX_COMPRESSION_RATIO?: string;
  readonly VITE_GEO_IMPORT_ZIP_MAX_UNCOMPRESSED_MB?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
