import { GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import { readExact, readSidecarText } from "@/features/data/services/geo-parsing/formats/fileReads";
import { memoryFile } from "@/features/data/__tests__/services/geo-parsing/helpers/files";
import { rejectionOf } from "@/features/data/__tests__/services/geo-parsing/helpers/errors";

const CORRUPTED_PRJ = { code: GeoParseErrorCode.CORRUPTED, params: { component: "prj" } };

describe("readExact", () => {
  it("reads the requested range", async () => {
    const view = await readExact(memoryFile("abcdef"), 2, 3, "prj");

    expect(new TextDecoder().decode(view)).toBe("cde");
  });

  it("refuses a file too short for the range", async () => {
    expect(await rejectionOf(readExact(memoryFile("abc"), 2, 3, "prj"))).toMatchObject(CORRUPTED_PRJ);
  });
});

describe("readSidecarText", () => {
  it("decodes UTF-8 and strips the BOM", async () => {
    expect(await readSidecarText(memoryFile("﻿UTF-8"), "cpg")).toBe("UTF-8");
  });

  it("returns an empty string for an empty file", async () => {
    expect(await readSidecarText(memoryFile(""), "prj")).toBe("");
  });

  it("refuses an oversized sidecar without reading it", async () => {
    const huge = memoryFile(new Uint8Array(64 * 1024 + 1));

    expect(await rejectionOf(readSidecarText(huge, "prj"))).toMatchObject(CORRUPTED_PRJ);
  });
});
