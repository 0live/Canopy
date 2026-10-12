import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import type { GeoFileMetadata, ParseContext } from "@/features/data/services/geo-parsing/core/types";
import {
  WorkerRequestType,
  type WorkerResponse,
  WorkerResponseType,
} from "@/features/data/services/geo-parsing/worker/protocol";

/** Same contract as ParseContext, on the main thread side */
export type WorkerParseOptions = ParseContext;

/** The subset of Worker used here, so tests can pass an in-process fake */
export type ParseWorker = Pick<Worker, "postMessage" | "terminate" | "onmessage" | "onerror" | "onmessageerror">;

type Settle = { resolve: (metadata: GeoFileMetadata) => void; reject: (error: GeoParseError) => void };

/** Main thread side of one parse: relays EPSG requests and owns the worker lifetime */
class WorkerParseSession {
  private settled = false;
  private readonly onAbort = () => this.fail(new GeoParseError(GeoParseErrorCode.ABORTED));
  private readonly worker: ParseWorker;
  private readonly options: WorkerParseOptions;
  private readonly settle: Settle;

  constructor(worker: ParseWorker, options: WorkerParseOptions, settle: Settle) {
    this.worker = worker;
    this.options = options;
    this.settle = settle;
  }

  start(file: File): void {
    if (this.options.signal.aborted) return this.onAbort();
    this.options.signal.addEventListener("abort", this.onAbort, { once: true });
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.handle(event.data);
    const crashed = (event: Event) => {
      // Handled here: keeps the browser from also reporting it as uncaught
      event.preventDefault();
      this.fail(new GeoParseError(GeoParseErrorCode.UNEXPECTED));
    };
    this.worker.onerror = crashed;
    this.worker.onmessageerror = crashed;
    this.worker.postMessage({ type: WorkerRequestType.PARSE, file });
  }

  private handle(message: WorkerResponse): void {
    if (this.settled) return;
    if (message.type === WorkerResponseType.PROGRESS) this.options.onProgress(message.bytesRead, message.totalBytes);
    else if (message.type === WorkerResponseType.EPSG_REQUEST) void this.relayEpsg(message.requestId, message.wkt);
    else if (message.type === WorkerResponseType.DONE) this.finish(() => this.settle.resolve(message.metadata));
    else this.fail(new GeoParseError(message.error.code, message.error.params));
  }

  private async relayEpsg(requestId: number, wkt: string): Promise<void> {
    try {
      const epsg = await this.options.resolveEpsg(wkt);
      this.worker.postMessage({ type: WorkerRequestType.EPSG_RESOLVED, requestId, epsg });
    } catch {
      this.worker.postMessage({ type: WorkerRequestType.EPSG_FAILED, requestId });
    }
  }

  private fail(error: GeoParseError): void {
    this.finish(() => this.settle.reject(error));
  }

  /** Terminating also cancels any read still running in the worker */
  private finish(notify: () => void): void {
    if (this.settled) return;
    this.settled = true;
    this.options.signal.removeEventListener("abort", this.onAbort);
    this.worker.terminate();
    notify();
  }
}

/**
 * Parses a file in the given worker, then terminates it. Always rejects with a
 * GeoParseError: ABORTED on signal, UNEXPECTED when the worker itself fails.
 */
export function parseInWorker(worker: ParseWorker, file: File, options: WorkerParseOptions): Promise<GeoFileMetadata> {
  return new Promise((resolve, reject) => new WorkerParseSession(worker, options, { resolve, reject }).start(file));
}
