import type { ReadableFile } from "@loaders.gl/loader-utils";
import { Reader } from "@zip.js/zip.js";

/**
 * zip.js reader backed by ranged reads on a ReadableFile: zip.js only pulls the
 * central directory and the entries it decompresses, never the whole archive.
 */
export class ReadableFileReader extends Reader<ReadableFile> {
  private readonly file: ReadableFile;

  constructor(file: ReadableFile) {
    super(file);
    this.file = file;
    this.size = file.size;
  }

  async readUint8Array(index: number, length: number): Promise<Uint8Array> {
    const available = Math.max(0, Math.min(length, this.size - index));
    return new Uint8Array(await this.file.read(index, available));
  }
}
