import { useState } from "react";
import { extractGeoMetadata } from "../services/load-data/metadataLoader";
import { type GeoFileMetadata, MetadataParseStatus } from "../types";

interface UseGeoFileMetadataReturn {
  status: MetadataParseStatus;
  metadata: GeoFileMetadata | null;
  error: string | null;
  parse: (file: File) => void;
  reset: () => void;
}

export function useGeoFileMetadata(): UseGeoFileMetadataReturn {
  const [status, setStatus] = useState<MetadataParseStatus>(MetadataParseStatus.IDLE);
  const [metadata, setMetadata] = useState<GeoFileMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parse = (file: File) => {
    setStatus(MetadataParseStatus.PARSING);
    setMetadata(null);
    setError(null);

    extractGeoMetadata(file)
      .then((result) => {
        setMetadata(result);
        setStatus(MetadataParseStatus.SUCCESS);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus(MetadataParseStatus.ERROR);
      });
  };

  const reset = () => {
    setStatus("idle");
    setMetadata(null);
    setError(null);
  };

  return { status, metadata, error, parse, reset };
}
