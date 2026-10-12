import { GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import {
  WorkerRequestType,
  type WorkerResponse,
  WorkerResponseType,
} from "@/features/data/services/geo-parsing/worker/protocol";
import { WorkerHost } from "@/features/data/services/geo-parsing/worker/workerHost";
import { gdalPointsEntries } from "@/features/data/__tests__/services/geo-parsing/helpers/gdalFixtures";
import { buildZip } from "@/features/data/__tests__/services/geo-parsing/helpers/zipFixtures";

function setup() {
  const posted: WorkerResponse[] = [];
  const host = new WorkerHost((message) => posted.push(message));
  const lastOf = (type: WorkerResponse["type"]) => posted.filter((message) => message.type === type).at(-1);
  return { host, posted, lastOf };
}

describe("WorkerHost", () => {
  it("posts a serializable error, not a GeoParseError instance", async () => {
    const { host, lastOf } = setup();

    host.handle({ type: WorkerRequestType.PARSE, file: new File(["<kml/>"], "map.kml") });

    await vi.waitFor(() =>
      expect(lastOf(WorkerResponseType.FAILED)).toEqual({
        type: WorkerResponseType.FAILED,
        error: { code: GeoParseErrorCode.UNSUPPORTED_FORMAT, params: {} },
      }),
    );
  });

  it("waits for the matching EPSG answer and ignores unknown request ids", async () => {
    const { host, lastOf } = setup();
    host.handle({ type: WorkerRequestType.PARSE, file: new File([await buildZip(gdalPointsEntries())], "export.zip") });
    await vi.waitFor(() => expect(lastOf(WorkerResponseType.EPSG_REQUEST)).toBeDefined());
    const request = lastOf(WorkerResponseType.EPSG_REQUEST) as { requestId: number };

    host.handle({ type: WorkerRequestType.EPSG_RESOLVED, requestId: request.requestId + 1, epsg: "2154" });
    host.handle({ type: WorkerRequestType.EPSG_RESOLVED, requestId: request.requestId, epsg: "4326" });

    await vi.waitFor(() => expect(lastOf(WorkerResponseType.DONE)).toBeDefined());
    expect(lastOf(WorkerResponseType.DONE)).toMatchObject({ metadata: { layers: [{ epsg: "4326" }] } });
  });
});
