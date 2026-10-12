export type Position = number[];

export const point = (...coordinates: Position) => ({ type: "Point", coordinates });
export const polygon = (...ring: Position[]) => ({ type: "Polygon", coordinates: [ring] });

export function feature(geometry: unknown, properties: Record<string, unknown> | null = {}) {
  return { type: "Feature", properties, geometry };
}

/** Extra root members (e.g. crs) are written after "features", the hardest case for streaming */
export function collection(features: unknown[], extraMembers: Record<string, unknown> = {}): string {
  return JSON.stringify({ type: "FeatureCollection", features, ...extraMembers });
}

export function namedCrs(name: string) {
  return { crs: { type: "name", properties: { name } } };
}
