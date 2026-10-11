import { GeoFormat, GeoWarningCode, ShapefileComponent } from "@/features/data/services/geo-parsing/core/enums";
import type {
  GeoField,
  GeoFormatParser,
  GeoLayerMetadata,
  GeoLayerWarning,
  ParseContext,
  VirtualFileSet,
} from "@/features/data/services/geo-parsing/core/types";
import { readSidecarText } from "@/features/data/services/geo-parsing/formats/fileReads";
import {
  findShapefileComponents,
  isShpPath,
  type ShapefileComponents,
} from "@/features/data/services/geo-parsing/formats/shapefile/components";
import { type DbfFieldDescriptor, readDbfHeader } from "@/features/data/services/geo-parsing/formats/shapefile/dbfHeader";
import { countShxRecords, readShapeType } from "@/features/data/services/geo-parsing/formats/shapefile/shpHeader";
import { resolveEpsgFromPrj } from "@/features/data/services/geo-parsing/normalize/crs";
import { resolveShapefileEncoding, textDecoderFor } from "@/features/data/services/geo-parsing/normalize/encoding";
import { fromDbfFieldType } from "@/features/data/services/geo-parsing/normalize/fieldTypes";
import { fromShpShapeType } from "@/features/data/services/geo-parsing/normalize/geometryTypes";

const NO_FIELDS_WARNING: GeoLayerWarning = { code: GeoWarningCode.NO_FIELDS };

function toGeoFields(descriptors: DbfFieldDescriptor[], encoding: string): GeoField[] {
  const decoder = textDecoderFor(encoding);
  return descriptors.map(({ nameBytes, typeCode }) => ({
    name: decoder.decode(nameBytes).trim(),
    type: fromDbfFieldType(typeCode),
    nativeType: typeCode,
  }));
}

/** Geometry first: a refused Z/M layer must not trigger an EPSG API call */
async function readGeometry({ shp, shx }: ShapefileComponents, signal: AbortSignal) {
  const geometryType = fromShpShapeType(await readShapeType(shp, ShapefileComponent.SHP));
  signal.throwIfAborted();
  await readShapeType(shx, ShapefileComponent.SHX);
  signal.throwIfAborted();
  return { geometryType, featureCount: countShxRecords(shx) };
}

async function readAttributes({ dbf, cpg }: ShapefileComponents, signal: AbortSignal) {
  const header = await readDbfHeader(dbf);
  const cpgText = cpg ? await readSidecarText(cpg, ShapefileComponent.CPG) : null;
  signal.throwIfAborted();
  const { encoding, warnings } = resolveShapefileEncoding(cpgText, header.languageDriverId);
  const fields = toGeoFields(header.fields, encoding);
  return { encoding, fields, warnings: fields.length === 0 ? [...warnings, NO_FIELDS_WARNING] : warnings };
}

async function parseShapefile(files: VirtualFileSet, ctx: ParseContext): Promise<GeoLayerMetadata[]> {
  ctx.signal.throwIfAborted();
  const components = findShapefileComponents(files);
  const { geometryType, featureCount } = await readGeometry(components, ctx.signal);
  const { encoding, fields, warnings } = await readAttributes(components, ctx.signal);
  const wkt = await readSidecarText(components.prj, ShapefileComponent.PRJ);
  const { epsg, source } = await resolveEpsgFromPrj(wkt, ctx.resolveEpsg);
  ctx.signal.throwIfAborted();
  return [
    { name: components.name, geometryType, epsg, epsgSource: source, fields, featureCount, encoding, warnings },
  ];
}

/**
 * Reads only headers and sidecars (a few KiB), whatever the dataset size.
 * Feature count comes from .shx and includes null shapes: counting those would need a full .shp scan.
 */
export const shapefileParser: GeoFormatParser = {
  format: GeoFormat.SHAPEFILE,
  extensions: [ShapefileComponent.SHP],
  canParse: (files) => [...files.keys()].some(isShpPath),
  parse: parseShapefile,
};
