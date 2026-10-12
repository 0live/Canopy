/** Paths use "/" separators: ZIP entry names and File names alike */

function fileNameOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

/** Lower-case extension after the last dot, "" when there is none */
export function extensionOf(path: string): string {
  const fileName = fileNameOf(path);
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/** File name without directory nor extension, e.g. the layer name */
export function fileStemOf(path: string): string {
  const fileName = fileNameOf(path);
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? fileName : fileName.slice(0, dot);
}
