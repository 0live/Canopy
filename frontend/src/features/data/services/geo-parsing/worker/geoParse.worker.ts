import type { WorkerRequest, WorkerResponse } from "@/features/data/services/geo-parsing/worker/protocol";
import { WorkerHost } from "@/features/data/services/geo-parsing/worker/workerHost";

// Worker entry point: only wires the worker global to the host
const host = new WorkerHost((message: WorkerResponse) => self.postMessage(message));

self.onmessage = (event: MessageEvent<WorkerRequest>) => host.handle(event.data);
