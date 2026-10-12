import { MESSAGE_LIST_SEPARATOR } from "@/features/data/services/geo-parsing/core/constants";
import { GeoFieldType, GeometryType, GeoWarningCode } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import type { GeoField, GeoLayerWarning } from "@/features/data/services/geo-parsing/core/types";
import { Extent, scanGeometry } from "@/features/data/services/geo-parsing/formats/geojson/geometryScan";
import { fromJsonValue, mergeFieldTypes } from "@/features/data/services/geo-parsing/normalize/fieldTypes";
import { mergeGeometryTypes } from "@/features/data/services/geo-parsing/normalize/geometryTypes";

const FEATURE_TYPE = "Feature";

export interface GeoJsonLayerSummary {
  featureCount: number;
  geometryType: GeometryType;
  fields: GeoField[];
  extent: Extent;
  warnings: GeoLayerWarning[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Folds features one by one, so a file of any size is summarized in constant memory */
export class GeoJsonLayerAccumulator {
  private featureCount = 0;
  private nullGeometries = 0;
  private readonly geometryTypes = new Set<GeometryType>();
  /** Insertion order = order of first appearance, kept for display */
  private readonly fieldTypes = new Map<string, GeoFieldType>();
  private readonly conflictingFields = new Set<string>();
  private readonly extent = new Extent();

  add(feature: unknown): void {
    const number = ++this.featureCount;
    if (!isPlainObject(feature) || feature.type !== FEATURE_TYPE) {
      throw new GeoParseError(GeoParseErrorCode.CORRUPTED, { feature: number });
    }
    const geometryType = scanGeometry(feature.geometry, number, this.extent);
    if (geometryType === null) this.nullGeometries++;
    else this.geometryTypes.add(geometryType);
    this.addProperties(feature.properties, number);
  }

  get count(): number {
    return this.featureCount;
  }

  summarize(): GeoJsonLayerSummary {
    const { geometryType, warnings } = mergeGeometryTypes(this.geometryTypes);
    const fields = [...this.fieldTypes].map(([name, type]) => ({ name, type, nativeType: null }));
    return {
      featureCount: this.featureCount,
      geometryType,
      fields,
      extent: this.extent,
      warnings: [...warnings, ...this.dataWarnings(fields.length)],
    };
  }

  private addProperties(properties: unknown, feature: number): void {
    if (properties === null || properties === undefined) return;
    if (!isPlainObject(properties)) throw new GeoParseError(GeoParseErrorCode.CORRUPTED, { feature });
    for (const [name, value] of Object.entries(properties)) {
      const { type, conflict } = mergeFieldTypes(this.fieldTypes.get(name) ?? GeoFieldType.UNKNOWN, fromJsonValue(value));
      this.fieldTypes.set(name, type);
      if (conflict) this.conflictingFields.add(name);
    }
  }

  private dataWarnings(fieldCount: number): GeoLayerWarning[] {
    const warnings: GeoLayerWarning[] = [];
    if (this.nullGeometries > 0) {
      warnings.push({ code: GeoWarningCode.NULL_GEOMETRIES, params: { count: this.nullGeometries } });
    }
    if (this.conflictingFields.size > 0) {
      const fields = [...this.conflictingFields].join(MESSAGE_LIST_SEPARATOR);
      warnings.push({ code: GeoWarningCode.MIXED_FIELD_TYPES, params: { fields } });
    }
    if (fieldCount === 0) warnings.push({ code: GeoWarningCode.NO_FIELDS });
    return warnings;
  }
}
