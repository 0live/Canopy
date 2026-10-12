import { PROGRESS_THROTTLE_MS } from "@/features/data/services/geo-parsing/core/constants";
import { toGeoParseError } from "@/features/data/services/geo-parsing/core/errors";
import type { ParseContext } from "@/features/data/services/geo-parsing/core/types";
import { extractGeoMetadata } from "@/features/data/services/geo-parsing/extract/extractGeoMetadata";
import {
  type WorkerRequest,
  WorkerRequestType,
  type WorkerResponse,
  WorkerResponseType,
} from "@/features/data/services/geo-parsing/worker/protocol";
import { throttleProgress } from "@/features/data/services/geo-parsing/worker/throttleProgress";

type PostResponse = (message: WorkerResponse) => void;

interface PendingEpsg {
  resolve: (epsg: string | null) => void;
  reject: (error: Error) => void;
}

/**
 * Worker side of the protocol, independent of the worker global so it can be
 * tested in-process. Cancellation is done by terminating the worker, hence a
 * signal that never aborts here.
 */
export class WorkerHost {
  private nextRequestId = 0;
  private readonly pendingEpsg = new Map<number, PendingEpsg>();
  private readonly post: PostResponse;

  constructor(post: PostResponse) {
    this.post = post;
  }

  handle(message: WorkerRequest): void {
    if (message.type === WorkerRequestType.PARSE) void this.parse(message.file);
    else this.settleEpsg(message);
  }

  private async parse(file: File): Promise<void> {
    try {
      const metadata = await extractGeoMetadata(file, this.context());
      this.post({ type: WorkerResponseType.DONE, metadata });
    } catch (error) {
      const { code, params } = toGeoParseError(error);
      this.post({ type: WorkerResponseType.FAILED, error: { code, params } });
    }
  }

  private context(): ParseContext {
    return {
      signal: new AbortController().signal,
      onProgress: throttleProgress(
        (bytesRead, totalBytes) => this.post({ type: WorkerResponseType.PROGRESS, bytesRead, totalBytes }),
        PROGRESS_THROTTLE_MS,
      ),
      resolveEpsg: (wkt) => this.requestEpsg(wkt),
    };
  }

  private requestEpsg(wkt: string): Promise<string | null> {
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.pendingEpsg.set(requestId, { resolve, reject });
      this.post({ type: WorkerResponseType.EPSG_REQUEST, requestId, wkt });
    });
  }

  private settleEpsg(message: Exclude<WorkerRequest, { type: typeof WorkerRequestType.PARSE }>): void {
    const pending = this.pendingEpsg.get(message.requestId);
    if (!pending) return;
    this.pendingEpsg.delete(message.requestId);
    // The rejection only needs to exist: crs.ts turns it into EPSG_SERVICE_UNAVAILABLE
    if (message.type === WorkerRequestType.EPSG_RESOLVED) pending.resolve(message.epsg);
    else pending.reject(new Error(WorkerRequestType.EPSG_FAILED));
  }
}
