import {
  GeoLayerIssueCode,
  GeoLayerProperty,
  GeometryType,
} from "@/features/data/services/geo-parsing/core/enums";
import type {
  GeoFileMetadata,
  GeoLayerIssue,
  GeoLayerMetadata,
} from "@/features/data/services/geo-parsing/core/types";

/** A PostGIS geometry column holds one known type */
const GEOMETRY_ISSUES: Partial<Record<GeometryType, GeoLayerIssueCode>> = {
  [GeometryType.UNKNOWN]: GeoLayerIssueCode.GEOMETRY_UNKNOWN,
  [GeometryType.MIXED]: GeoLayerIssueCode.GEOMETRY_MIXED,
};

/**
 * Blocking issues of a parsed layer. Warnings (no fields, assumed EPSG...) are
 * not issues: they are carried by the layer itself and do not prevent the import.
 */
export function validateLayer(layer: GeoLayerMetadata): GeoLayerIssue[] {
  const issues: GeoLayerIssue[] = [];
  const geometryIssue = GEOMETRY_ISSUES[layer.geometryType];
  if (geometryIssue) issues.push({ code: geometryIssue, property: GeoLayerProperty.GEOMETRY_TYPE });
  if (layer.epsg === null) issues.push({ code: GeoLayerIssueCode.EPSG_NOT_FOUND, property: GeoLayerProperty.EPSG });
  return issues;
}

export function isImportable(metadata: GeoFileMetadata): boolean {
  return metadata.layers.length > 0 && metadata.layers.every((layer) => validateLayer(layer).length === 0);
}
