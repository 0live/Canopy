import { act, renderHook } from "@testing-library/react";
import { GeoFormat } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import type { GeoFileMetadata } from "@/features/data/services/geo-parsing/core/types";
import type { GeoParseOptions } from "@/features/data/services/geo-parsing/worker/parseGeoFile";
import { parseGeoFile } from "@/features/data/services/geo-parsing/worker/parseGeoFile";
import { useGeoFileMetadata } from "@/features/data/hooks/useGeoFileMetadata";
import { MetadataParseStatus } from "@/features/data/types";

// The real entry point starts a Web Worker, which jsdom lacks; the worker is tested on its own
vi.mock("@/features/data/services/geo-parsing/worker/parseGeoFile", () => ({ parseGeoFile: vi.fn() }));

interface PendingParse {
  options: GeoParseOptions;
  resolve: (metadata: GeoFileMetadata) => void;
  reject: (error: unknown) => void;
}

/** Each call to parseGeoFile stays pending until the test settles it */
function controlParses(): PendingParse[] {
  const pending: PendingParse[] = [];
  vi.mocked(parseGeoFile).mockImplementation(
    (_file, options) => new Promise((resolve, reject) => pending.push({ options, resolve, reject })),
  );
  return pending;
}

const file = new File(["{}"], "communes.geojson");
const METADATA: GeoFileMetadata = { fileName: file.name, fileSize: 2, format: GeoFormat.GEOJSON, layers: [], parseTimeMs: 1 };

describe("useGeoFileMetadata", () => {
  it("reports progress, then the metadata", async () => {
    const pending = controlParses();
    const { result } = renderHook(() => useGeoFileMetadata());

    act(() => result.current.parse(file));
    act(() => pending[0].options.onProgress(512, 2048));

    expect(result.current).toMatchObject({ status: MetadataParseStatus.PARSING, file, progress: 25 });
    await act(async () => pending[0].resolve(METADATA));
    expect(result.current).toMatchObject({ status: MetadataParseStatus.SUCCESS, metadata: METADATA });
  });

  it("keeps the parse error for display", async () => {
    const pending = controlParses();
    const { result } = renderHook(() => useGeoFileMetadata());
    const error = new GeoParseError(GeoParseErrorCode.TOO_LARGE, { maxSizeMb: 2048 });

    act(() => result.current.parse(file));
    await act(async () => pending[0].reject(error));

    expect(result.current).toMatchObject({ status: MetadataParseStatus.ERROR, error });
  });

  it("cancels the previous parse when a new file is chosen, and drops its late result", async () => {
    const pending = controlParses();
    const { result } = renderHook(() => useGeoFileMetadata());

    act(() => result.current.parse(file));
    act(() => result.current.parse(new File(["{}"], "other.geojson")));
    await act(async () => pending[0].resolve(METADATA));

    expect(pending[0].options.signal.aborted).toBe(true);
    expect(result.current).toMatchObject({ status: MetadataParseStatus.PARSING, metadata: null });
  });

  it("cancels on reset and comes back to idle, ignoring the abort rejection", async () => {
    const pending = controlParses();
    const { result } = renderHook(() => useGeoFileMetadata());

    act(() => result.current.parse(file));
    act(() => result.current.reset());
    await act(async () => pending[0].reject(new GeoParseError(GeoParseErrorCode.ABORTED)));

    expect(pending[0].options.signal.aborted).toBe(true);
    expect(result.current).toMatchObject({ status: MetadataParseStatus.IDLE, file: null, error: null });
  });

  it("cancels the parse when unmounted", () => {
    const pending = controlParses();
    const { result, unmount } = renderHook(() => useGeoFileMetadata());

    act(() => result.current.parse(file));
    unmount();

    expect(pending[0].options.signal.aborted).toBe(true);
  });
});
