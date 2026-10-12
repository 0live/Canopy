import type { WorkerRequest, WorkerResponse } from "@/features/data/services/geo-parsing/worker/protocol";
import type { ParseWorker } from "@/features/data/services/geo-parsing/worker/parseInWorker";
import { WorkerHost } from "@/features/data/services/geo-parsing/worker/workerHost";

type Listener = ((event: never) => unknown) | null;

/** Records what the session posts and lets the test play the worker side */
export class ScriptedWorker {
  onmessage: Listener = null;
  onerror: Listener = null;
  onmessageerror: Listener = null;
  readonly received: WorkerRequest[] = [];
  terminate = vi.fn();

  postMessage(message: WorkerRequest): void {
    this.received.push(message);
  }

  respond(message: WorkerResponse): void {
    (this.onmessage as ((event: MessageEvent) => void) | null)?.(new MessageEvent("message", { data: message }));
  }

  crash(): Event {
    const event = new Event("error", { cancelable: true });
    (this.onerror as ((event: Event) => void) | null)?.(event);
    return event;
  }

  asWorker(): ParseWorker {
    return this as unknown as ParseWorker;
  }
}

/**
 * Runs the real WorkerHost in-process. Messages hop through microtasks, as they
 * would asynchronously cross threads; nothing is delivered once terminated.
 */
export class InProcessWorker extends ScriptedWorker {
  private readonly host = new WorkerHost((message) => this.deliver(() => this.respond(message)));

  override postMessage(message: WorkerRequest): void {
    super.postMessage(message);
    this.deliver(() => this.host.handle(message));
  }

  private deliver(send: () => void): void {
    queueMicrotask(() => {
      if (this.terminate.mock.calls.length === 0) send();
    });
  }
}
