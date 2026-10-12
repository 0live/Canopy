import { EpsgSource, ExtraDimension, GeoFormat } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import { WorkerRequestType, WorkerResponseType } from "@/features/data/services/geo-parsing/worker/protocol";
import { parseInWorker, type WorkerParseOptions } from "@/features/data/services/geo-parsing/worker/parseInWorker";
import { rejectionOf } from "@/features/data/__tests__/services/geo-parsing/helpers/errors";
import { InProcessWorker, ScriptedWorker } from "@/features/data/__tests__/services/geo-parsing/helpers/fakeWorkers";
import { GDAL_ESRI_PRJ, gdalPointsEntries } from "@/features/data/__tests__/services/geo-parsing/helpers/gdalFixtures";
import { collection, feature, point } from "@/features/data/__tests__/services/geo-parsing/helpers/geojsonFixtures";
import { buildZip } from "@/features/data/__tests__/services/geo-parsing/helpers/zipFixtures";

const GEOJSON = collection([feature(point(1, 49), { nom: "Caen" })]);
const geojsonFile = (content = GEOJSON) => new File([content], "communes.geojson");

function options(overrides: Partial<WorkerParseOptions> = {}): WorkerParseOptions {
  return {
    signal: new AbortController().signal,
    onProgress: vi.fn(),
    resolveEpsg: vi.fn().mockResolvedValue("4326"),
    ...overrides,
  };
}

describe("parseInWorker, through the real worker host", () => {
  it("returns the metadata, forwards progress and terminates the worker", async () => {
    const worker = new InProcessWorker();
    const file = geojsonFile();
    const opts = options();

    const metadata = await parseInWorker(worker.asWorker(), file, opts);

    expect(metadata).toMatchObject({ format: GeoFormat.GEOJSON, layers: [{ name: "communes", featureCount: 1 }] });
    expect(opts.onProgress).toHaveBeenLastCalledWith(file.size, file.size);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("relays the EPSG lookup of an ESRI .prj to the main thread", async () => {
    const opts = options();
    const zip = new File([await buildZip(gdalPointsEntries())], "export.zip");

    const metadata = await parseInWorker(new InProcessWorker().asWorker(), zip, opts);

    expect(opts.resolveEpsg).toHaveBeenCalledWith(GDAL_ESRI_PRJ);
    expect(metadata.layers).toMatchObject([{ epsg: "4326", epsgSource: EpsgSource.DETECTED }]);
  });

  it("reports an unreachable EPSG API as such", async () => {
    const opts = options({ resolveEpsg: vi.fn().mockRejectedValue(new Error("Network Error")) });
    const zip = new File([await buildZip(gdalPointsEntries())], "export.zip");

    const error = await rejectionOf(parseInWorker(new InProcessWorker().asWorker(), zip, opts));

    expect(error.code).toBe(GeoParseErrorCode.EPSG_SERVICE_UNAVAILABLE);
  });

  it("rebuilds the parse error with its params", async () => {
    const file = geojsonFile(collection([feature(point(1, 49, 12))]));

    const error = await rejectionOf(parseInWorker(new InProcessWorker().asWorker(), file, options()));

    expect(error.code).toBe(GeoParseErrorCode.UNSUPPORTED_DIMENSIONS);
    expect(error.params).toEqual({ dimension: ExtraDimension.Z, feature: 1 });
  });
});

describe("parseInWorker, worker lifetime", () => {
  it("aborts by terminating the worker", async () => {
    const worker = new ScriptedWorker();
    const controller = new AbortController();
    const parsing = parseInWorker(worker.asWorker(), geojsonFile(), options({ signal: controller.signal }));

    controller.abort();

    expect((await rejectionOf(parsing)).code).toBe(GeoParseErrorCode.ABORTED);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("does not start a parse whose signal is already aborted", async () => {
    const worker = new ScriptedWorker();

    const parsing = parseInWorker(worker.asWorker(), geojsonFile(), options({ signal: AbortSignal.abort() }));

    expect((await rejectionOf(parsing)).code).toBe(GeoParseErrorCode.ABORTED);
    expect(worker.received).toEqual([]);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("reports a crashed worker as unexpected, not as a corrupted file", async () => {
    const worker = new ScriptedWorker();
    const parsing = parseInWorker(worker.asWorker(), geojsonFile(), options());

    const event = worker.crash();

    expect((await rejectionOf(parsing)).code).toBe(GeoParseErrorCode.UNEXPECTED);
    expect(event.defaultPrevented).toBe(true);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("ignores messages once settled", async () => {
    const worker = new ScriptedWorker();
    const opts = options();
    const parsing = parseInWorker(worker.asWorker(), geojsonFile(), opts);

    worker.respond({ type: WorkerResponseType.FAILED, error: { code: GeoParseErrorCode.EMPTY, params: {} } });
    worker.respond({ type: WorkerResponseType.PROGRESS, bytesRead: 1, totalBytes: 2 });

    expect((await rejectionOf(parsing)).code).toBe(GeoParseErrorCode.EMPTY);
    expect(opts.onProgress).not.toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("answers an EPSG request with the resolved code", async () => {
    const worker = new ScriptedWorker();
    void parseInWorker(worker.asWorker(), geojsonFile(), options({ resolveEpsg: vi.fn().mockResolvedValue(null) }));

    worker.respond({ type: WorkerResponseType.EPSG_REQUEST, requestId: 7, wkt: GDAL_ESRI_PRJ });

    await vi.waitFor(() =>
      expect(worker.received).toContainEqual({ type: WorkerRequestType.EPSG_RESOLVED, requestId: 7, epsg: null }),
    );
  });
});
