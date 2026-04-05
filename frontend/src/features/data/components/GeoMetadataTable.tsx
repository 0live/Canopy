import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { useTranslation } from "react-i18next";
import type { GeoFileMetadata, GeoLayerMetadata } from "../types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBbox(bbox: GeoLayerMetadata["bbox"]): string {
  if (!bbox) return "—";
  return bbox.map((v) => v.toFixed(4)).join(", ");
}

interface GeoMetadataTableProps {
  metadata: GeoFileMetadata;
}

export function GeoMetadataTable({ metadata }: GeoMetadataTableProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{metadata.fileName}</span>
        <span>·</span>
        <span>{formatFileSize(metadata.fileSize)}</span>
        <span>·</span>
        <span>{metadata.format.toUpperCase()}</span>
        <span>·</span>
        <span>{t("data.load.postgis.parsedIn", { ms: metadata.parseTimeMs })}</span>
      </div>

      {metadata.layers.map((layer, i) => (
        <LayerSection key={i} layer={layer} />
      ))}
    </div>
  );
}

function LayerSection({ layer }: { layer: GeoLayerMetadata }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{layer.name}</h3>

      <Table>
        <TableBody>
          <TableRow>
            <TableCell className="text-muted-foreground w-40">{t("data.load.postgis.meta.geometryType")}</TableCell>
            <TableCell>{layer.geometryType}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">{t("data.load.postgis.meta.featureCount")}</TableCell>
            <TableCell>
              {layer.featureCount !== null
                ? layer.featureCount
                : t("data.load.postgis.meta.featureCountUnknown")}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">{t("data.load.postgis.meta.epsg")}</TableCell>
            <TableCell>{layer.epsg ?? "—"}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">{t("data.load.postgis.meta.bbox")}</TableCell>
            <TableCell className="font-mono text-xs">{formatBbox(layer.bbox)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {layer.fields.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("data.load.postgis.meta.fields")} ({layer.fields.length})
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("data.load.postgis.meta.fieldName")}</TableHead>
                <TableHead>{t("data.load.postgis.meta.fieldType")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {layer.fields.map((field) => (
                <TableRow key={field.name}>
                  <TableCell className="font-mono text-xs">{field.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{field.type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
