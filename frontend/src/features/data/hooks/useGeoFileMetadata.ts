import { useEffect, useRef, useState } from "react";
import { type GeoParseError, toGeoParseError } from "@/features/data/services/geo-parsing/core/errors";
import { parseGeoFile } from "@/features/data/services/geo-parsing/worker/parseGeoFile";
import { type GeoFileMetadata, MetadataParseStatus } from "@/features/data/types";

const FULL_PERCENT = 100;

export interface GeoFileMetadataState {
  status: MetadataParseStatus;
  metadata: GeoFileMetadata | null;
  file: File | null;
  error: GeoParseError | null;
  /** Share of the file read so far, 0 to 100 */
  progress: number;
}

const IDLE_STATE: GeoFileMetadataState = {
  status: MetadataParseStatus.IDLE,
  metadata: null,
  file: null,
  error: null,
  progress: 0,
};

function toPercent(bytesRead: number, totalBytes: number): number {
  return totalBytes > 0 ? Math.floor((bytesRead * FULL_PERCENT) / totalBytes) : 0;
}

/**
 * Parses the chosen file in the background. A new file or a reset cancels the
 * parse in progress, whose late results are then dropped.
 */
export function useGeoFileMetadata() {
  const [state, setState] = useState<GeoFileMetadataState>(IDLE_STATE);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const reset = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(IDLE_STATE);
  };

  const parse = (file: File) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ ...IDLE_STATE, status: MetadataParseStatus.PARSING, file });
    const update = (change: Partial<GeoFileMetadataState>) => {
      if (controllerRef.current === controller) setState((previous) => ({ ...previous, ...change }));
    };
    parseGeoFile(file, {
      signal: controller.signal,
      onProgress: (bytesRead, totalBytes) => update({ progress: toPercent(bytesRead, totalBytes) }),
    })
      .then((metadata) => update({ status: MetadataParseStatus.SUCCESS, metadata }))
      .catch((error: unknown) => update({ status: MetadataParseStatus.ERROR, error: toGeoParseError(error) }));
  };

  return { ...state, parse, reset };
}
