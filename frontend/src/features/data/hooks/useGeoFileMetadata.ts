import { useState } from "react";
import { extractGeoMetadata } from "../services/load-data/metadataLoader";
import { type GeoFileMetadata, MetadataParseStatus } from "../types";

interface UseGeoFileMetadataReturn {
  status: MetadataParseStatus;
  metadata: GeoFileMetadata | null;
  file: File | null;
  error: string | null;
  parse: (file: File) => void;
  reset: () => void;
}

export function useGeoFileMetadata(): UseGeoFileMetadataReturn {
  const [status, setStatus] = useState<MetadataParseStatus>(MetadataParseStatus.IDLE);
  const [metadata, setMetadata] = useState<GeoFileMetadata | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parse = (f: File) => {
    setStatus(MetadataParseStatus.PARSING);
    setMetadata(null);
    setFile(f);
    setError(null);

    extractGeoMetadata(f)
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
    setStatus(MetadataParseStatus.IDLE);
    setMetadata(null);
    setFile(null);
    setError(null);
  };

  return { status, metadata, file, error, parse, reset };
}
