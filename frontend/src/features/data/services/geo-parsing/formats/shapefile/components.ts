import type { ReadableFile } from "@loaders.gl/loader-utils";
import { MESSAGE_LIST_SEPARATOR } from "@/features/data/services/geo-parsing/core/constants";
import { ShapefileComponent } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import type { VirtualFileSet } from "@/features/data/services/geo-parsing/core/types";

export interface ShapefileComponents {
  /** Layer name: the .shp base name, without directory nor extension */
  name: string;
  shp: ReadableFile;
  shx: ReadableFile;
  dbf: ReadableFile;
  prj: ReadableFile;
  cpg: ReadableFile | null;
}

const REQUIRED_SIDECARS = [ShapefileComponent.SHX, ShapefileComponent.DBF, ShapefileComponent.PRJ] as const;
const SHP_SUFFIX = `.${ShapefileComponent.SHP}`;

type RequiredSidecar = (typeof REQUIRED_SIDECARS)[number];
type SidecarLookup = (component: ShapefileComponent) => ReadableFile | null;

export function isShpPath(path: string): boolean {
  return path.toLowerCase().endsWith(SHP_SUFFIX);
}

function findSingleShp(files: VirtualFileSet): [string, ReadableFile] {
  const shpEntries = [...files].filter(([path]) => isShpPath(path));
  if (shpEntries.length === 0) throw new GeoParseError(GeoParseErrorCode.UNSUPPORTED_FORMAT);
  if (shpEntries.length > 1) {
    throw new GeoParseError(GeoParseErrorCode.MULTIPLE_LAYERS, { count: shpEntries.length });
  }
  return shpEntries[0];
}

/** Sidecars share the .shp path stem; paths are matched case-insensitively */
function sidecarLookup(files: VirtualFileSet, stem: string): SidecarLookup {
  const byLowerPath = new Map([...files].map(([path, file]) => [path.toLowerCase(), file]));
  return (component) => byLowerPath.get(`${stem.toLowerCase()}.${component}`) ?? null;
}

/** Reports every missing sidecar at once, so the user fixes the archive in one go */
function requireSidecars(sidecar: SidecarLookup): Record<RequiredSidecar, ReadableFile> {
  const found: Partial<Record<RequiredSidecar, ReadableFile>> = {};
  const missing: string[] = [];
  for (const component of REQUIRED_SIDECARS) {
    const file = sidecar(component);
    if (file) found[component] = file;
    else missing.push(`.${component}`);
  }
  if (missing.length > 0) {
    throw new GeoParseError(GeoParseErrorCode.MISSING_COMPONENT, {
      components: missing.join(MESSAGE_LIST_SEPARATOR),
    });
  }
  return found as Record<RequiredSidecar, ReadableFile>;
}

/** Locates the files of the single dataset; .shx, .dbf and .prj are all required */
export function findShapefileComponents(files: VirtualFileSet): ShapefileComponents {
  const [shpPath, shp] = findSingleShp(files);
  const stem = shpPath.slice(0, -SHP_SUFFIX.length);
  const sidecar = sidecarLookup(files, stem);
  return {
    name: stem.slice(stem.lastIndexOf("/") + 1),
    shp,
    ...requireSidecars(sidecar),
    cpg: sidecar(ShapefileComponent.CPG),
  };
}
