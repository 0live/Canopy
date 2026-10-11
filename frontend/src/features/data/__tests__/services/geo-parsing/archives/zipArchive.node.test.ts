import { openZipArchive } from "@/features/data/services/geo-parsing/archives/zipArchive";
import { ArchiveRejectReason } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseErrorCode, toGeoParseError } from "@/features/data/services/geo-parsing/core/errors";
import { memoryFile, noiseBytes, spyFile } from "@/features/data/__tests__/services/geo-parsing/helpers/files";
import { buildZip, ZipLevel } from "@/features/data/__tests__/services/geo-parsing/helpers/zipFixtures";

const MIB = 1024 * 1024;
const BIG_ENTRY_BYTES = 8 * MIB;
/** Central directory + stream read-ahead (constant, measured ~640 KiB), far below the entry size */
const BOUNDED_READ_LIMIT = 1 * MIB;

const decode = (buffer: ArrayBuffer) => new TextDecoder().decode(buffer);
const open = async (bytes: Uint8Array<ArrayBuffer>, signal = new AbortController().signal) =>
  openZipArchive(memoryFile(bytes), signal);

async function errorCodeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return toGeoParseError(error);
  }
  throw new Error("expected a rejection");
}

describe("openZipArchive", () => {
  it("lists dataset files and skips directories and OS metadata", async () => {
    const zip = await buildZip({
      "data/": "",
      "data/roads.shp": "shp",
      "data/roads.dbf": "dbf",
      "__MACOSX/data/._roads.shp": "fork",
      ".DS_Store": "finder",
    });

    const files = await open(zip);

    expect([...files.keys()].sort()).toEqual(["data/roads.dbf", "data/roads.shp"]);
    expect(files.get("data/roads.shp")?.size).toBe(3);
  });

  it.each([ZipLevel.STORED, ZipLevel.DEFLATE])("reads entry ranges (level %s)", async (level) => {
    const files = await open(await buildZip({ "a.txt": "0123456789" }, { level }));
    const entry = files.get("a.txt")!;

    expect(decode(await entry.read(0, 10))).toBe("0123456789");
    expect(decode(await entry.read(0, 4))).toBe("0123");
    expect(decode(await entry.read(3, 4))).toBe("3456");
    expect(decode(await entry.read(8, 100))).toBe("89");
    expect((await entry.read(10, 5)).byteLength).toBe(0);
  });

  it.each([ZipLevel.STORED, ZipLevel.DEFLATE])(
    "reads a header without pulling the whole archive (level %s)",
    async (level) => {
      const archive = spyFile(memoryFile(await buildZip({ "big.bin": noiseBytes(BIG_ENTRY_BYTES) }, { level })));

      const files = await openZipArchive(archive, new AbortController().signal);
      const header = await files.get("big.bin")!.read(0, 100);

      expect(new Uint8Array(header)).toEqual(noiseBytes(100));
      expect(archive.bytesRead).toBeLessThan(BOUNDED_READ_LIMIT);
    },
  );

  it.each([
    ["random bytes", noiseBytes(4096)],
    ["an empty file", new Uint8Array(0)],
  ])("rejects %s as CORRUPTED", async (_label, bytes) => {
    expect((await errorCodeOf(open(bytes))).code).toBe(GeoParseErrorCode.CORRUPTED);
  });

  it("rejects a truncated archive as CORRUPTED", async () => {
    const zip = await buildZip({ "a.txt": "content" });

    const error = await errorCodeOf(open(zip.slice(0, zip.length - 10)));

    expect(error.code).toBe(GeoParseErrorCode.CORRUPTED);
  });

  it("rejects an encrypted archive as unsafe", async () => {
    const zip = await buildZip({ "a.txt": "secret" }, { password: "pwd" });

    const error = await errorCodeOf(open(zip));

    expect(error.code).toBe(GeoParseErrorCode.ARCHIVE_UNSAFE);
    expect(error.params.reason).toBe(ArchiveRejectReason.ENCRYPTED);
  });

  it("is ABORTED when the signal is already aborted", async () => {
    const zip = await buildZip({ "a.txt": "content" });

    const error = await errorCodeOf(open(zip, AbortSignal.abort()));

    expect(error.code).toBe(GeoParseErrorCode.ABORTED);
  });

  it("is ABORTED when an entry is read after cancellation", async () => {
    const controller = new AbortController();
    const files = await open(await buildZip({ "a.txt": "content" }), controller.signal);
    controller.abort();

    const error = await errorCodeOf(files.get("a.txt")!.read(0, 3));

    expect(error.code).toBe(GeoParseErrorCode.ABORTED);
  });
});
