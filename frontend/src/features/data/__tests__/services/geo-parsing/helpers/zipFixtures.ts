import { configure, Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";

configure({ useWebWorkers: false });

export const ZipLevel = {
  STORED: 0,
  DEFLATE: 6,
} as const;

export type ZipLevel = (typeof ZipLevel)[keyof typeof ZipLevel];

export interface ZipFixtureOptions {
  level?: ZipLevel;
  password?: string;
}

/** Builds an in-memory ZIP; a trailing "/" in a name creates a directory entry */
export async function buildZip(
  entries: Record<string, Uint8Array | string>,
  { level = ZipLevel.DEFLATE, password }: ZipFixtureOptions = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const writer = new ZipWriter(new Uint8ArrayWriter(), { level, password });
  for (const [name, content] of Object.entries(entries)) {
    if (name.endsWith("/")) {
      await writer.add(name, undefined, { directory: true });
      continue;
    }
    const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
    await writer.add(name, new Uint8ArrayReader(bytes));
  }
  return writer.close();
}
