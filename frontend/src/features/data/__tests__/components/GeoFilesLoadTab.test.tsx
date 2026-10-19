import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GeoFilesLoadTab } from "@/features/data/components/load-data/GeoFilesLoadTab";
import { EpsgSource, GeoFieldType, GeoFormat, GeometryType, GeoWarningCode } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import type { GeoFileMetadata, GeoLayerMetadata } from "@/features/data/services/geo-parsing/core/types";
import { parseGeoFile } from "@/features/data/services/geo-parsing/worker/parseGeoFile";
import { renderWithProviders } from "@/test/utils/renderWithProviders";

// The real entry point starts a Web Worker, which jsdom lacks; the worker is tested on its own
vi.mock("@/features/data/services/geo-parsing/worker/parseGeoFile", () => ({ parseGeoFile: vi.fn() }));

// cimode: t() returns keys, so assertions name the message shown
const DROPZONE = "data.load.postgis.dropzone";

function metadataWith(overrides: Partial<GeoLayerMetadata> = {}): GeoFileMetadata {
  const layer: GeoLayerMetadata = {
    name: "communes",
    geometryType: GeometryType.MULTIPOLYGON,
    epsg: "2154",
    epsgSource: EpsgSource.DETECTED,
    fields: [{ name: "nom", type: GeoFieldType.STRING, nativeType: "C" }],
    featureCount: 34945,
    encoding: "ISO-8859-1",
    warnings: [{ code: GeoWarningCode.ENCODING_ASSUMED, params: { encoding: "ISO-8859-1" } }],
    ...overrides,
  };
  return { fileName: "communes.zip", fileSize: 2048, format: GeoFormat.SHAPEFILE, layers: [layer], parseTimeMs: 5 };
}

function dropFile(name: string): File {
  const file = new File(["x"], name);
  fireEvent.drop(screen.getByRole("button", { name: DROPZONE }), { dataTransfer: { files: [file] } });
  return file;
}

describe("GeoFilesLoadTab", () => {
  it("shows the parse progress and lets the user cancel it", async () => {
    vi.mocked(parseGeoFile).mockImplementation((_file, { onProgress }) => {
      onProgress(1, 4);
      return new Promise(() => {});
    });
    renderWithProviders(<GeoFilesLoadTab />);

    dropFile("communes.geojson");
    expect(await screen.findByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
    await userEvent.click(screen.getByRole("button", { name: "data.load.postgis.cancelParsing" }));

    expect(screen.getByRole("button", { name: DROPZONE })).toBeInTheDocument();
    expect(vi.mocked(parseGeoFile).mock.calls[0][1].signal.aborted).toBe(true);
  });

  it("sends a dropped file of any type to the parser and shows why it is refused", async () => {
    vi.mocked(parseGeoFile).mockRejectedValue(new GeoParseError(GeoParseErrorCode.UNSUPPORTED_FORMAT));
    renderWithProviders(<GeoFilesLoadTab />);

    const file = dropFile("map.kml");

    expect(await screen.findByRole("alert")).toHaveTextContent("data.load.postgis.parseError");
    expect(parseGeoFile).toHaveBeenCalledWith(file, expect.anything());
  });

  it("shows the new metadata cards and the warnings", async () => {
    vi.mocked(parseGeoFile).mockResolvedValue(metadataWith());
    renderWithProviders(<GeoFilesLoadTab />);

    dropFile("communes.zip");

    expect(await screen.findByText("data.load.postgis.meta.epsgDetected")).toBeInTheDocument();
    expect(screen.getByText("ISO-8859-1")).toBeInTheDocument();
    expect(screen.getByText(/34.945/)).toBeInTheDocument();
    expect(screen.getByText("data.load.postgis.warnings.encodingAssumed")).toBeInTheDocument();
  });

  it("blocks export on a layer issue, shown on its card", async () => {
    vi.mocked(parseGeoFile).mockResolvedValue(metadataWith({ epsg: null, epsgSource: EpsgSource.NONE }));
    renderWithProviders(<GeoFilesLoadTab />);

    dropFile("communes.zip");

    expect(await screen.findAllByText("data.load.postgis.errors.epsgMissing")).not.toHaveLength(0);
    expect(screen.getByRole("button", { name: "data.load.postgis.export" })).toBeDisabled();
  });

  it("accepts a layer without fields", async () => {
    vi.mocked(parseGeoFile).mockResolvedValue(
      metadataWith({ fields: [], warnings: [{ code: GeoWarningCode.NO_FIELDS }] }),
    );
    renderWithProviders(<GeoFilesLoadTab />);

    dropFile("communes.zip");

    expect(await screen.findByText("data.load.postgis.warnings.noFields")).toBeInTheDocument();
    expect(screen.queryByText("data.load.postgis.validation.noFieldSelected")).not.toBeInTheDocument();
  });
});
