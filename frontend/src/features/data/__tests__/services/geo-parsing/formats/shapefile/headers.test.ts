import { ShapefileComponent } from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import { readDbfHeader } from "@/features/data/services/geo-parsing/formats/shapefile/dbfHeader";
import { countShxRecords, readShapeType } from "@/features/data/services/geo-parsing/formats/shapefile/shpHeader";
import { ShpShapeType } from "@/features/data/services/geo-parsing/normalize/geometryTypes";
import { memoryFile } from "@/features/data/__tests__/services/geo-parsing/helpers/files";
import { rejectionOf, thrownBy } from "@/features/data/__tests__/services/geo-parsing/helpers/errors";
import { dbfBytes, shpBytes } from "@/features/data/__tests__/services/geo-parsing/helpers/shapefileFixtures";

const { SHP, SHX, DBF } = ShapefileComponent;
const corrupted = (component: string) => ({ code: GeoParseErrorCode.CORRUPTED, params: { component } });
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("readShapeType", () => {
  it("reads the shape type of a valid header", async () => {
    expect(await readShapeType(memoryFile(shpBytes({ shapeType: ShpShapeType.POLYGON })), SHP)).toBe(5);
  });

  it.each([
    ["a wrong file code", shpBytes({ fileCode: 1234 })],
    ["a wrong version", shpBytes({ version: 999 })],
    ["a truncated header", shpBytes().slice(0, 50)],
  ])("refuses %s", async (_label, bytes) => {
    expect(await rejectionOf(readShapeType(memoryFile(bytes), SHX))).toMatchObject(corrupted(SHX));
  });
});

describe("countShxRecords", () => {
  it.each([0, 1, 1000])("counts %i records", (records) => {
    expect(countShxRecords(memoryFile(shpBytes({ records })))).toBe(records);
  });

  it("refuses a partial record", () => {
    const partial = memoryFile(new Uint8Array([...shpBytes({ records: 1 }), 0]));

    expect(thrownBy(() => countShxRecords(partial))).toMatchObject(corrupted(SHX));
  });
});

describe("readDbfHeader", () => {
  it("reads record count, language driver and raw field descriptors", async () => {
    const dbf = dbfBytes({ records: 42, languageDriverId: 87, fields: [{ name: "NOM", type: "C" }, { name: "SURFACE_M2", type: "N" }] });

    const header = await readDbfHeader(memoryFile(dbf));

    expect(header).toMatchObject({ recordCount: 42, languageDriverId: 87 });
    expect(header.fields.map(({ nameBytes, typeCode }) => [decode(nameBytes), typeCode])).toEqual([
      ["NOM", "C"],
      ["SURFACE_M2", "N"],
    ]);
  });

  it("keeps an 11-character name that has no NUL terminator", async () => {
    const header = await readDbfHeader(memoryFile(dbfBytes({ fields: [{ name: "ELEVENCHARS", type: "N" }] })));

    expect(decode(header.fields[0].nameBytes)).toBe("ELEVENCHARS");
  });

  it("reads a table without fields", async () => {
    expect((await readDbfHeader(memoryFile(dbfBytes()))).fields).toEqual([]);
  });

  it("reads only the header, not the records", async () => {
    const withRecords = new Uint8Array([...dbfBytes({ records: 1, fields: [{ name: "A", type: "C" }] }), 0x20, 0x41]);
    const file = memoryFile(withRecords);
    const read = vi.spyOn(file, "read");

    await readDbfHeader(file);

    const bytesRead = read.mock.calls.reduce((sum, [, length]) => sum + Number(length), 0);
    expect(bytesRead).toBe(withRecords.length - 2);
  });

  it.each([
    ["a truncated main header", dbfBytes().slice(0, 20)],
    ["a header length pointing past the end", dbfBytes({ fields: [{ name: "A", type: "C" }] }).slice(0, 40)],
    ["a header length without terminator", (() => { const bytes = dbfBytes(); bytes[8] = 32; return bytes; })()],
  ])("refuses %s", async (_label, bytes) => {
    expect(await rejectionOf(readDbfHeader(memoryFile(bytes)))).toMatchObject(corrupted(DBF));
  });
});
