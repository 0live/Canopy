import { GeoParseError } from "@/features/data/services/geo-parsing/core/errors";

/** Fails the test unless the error is a GeoParseError: a stray TypeError must not pass as CORRUPTED */
function asGeoParseError(error: unknown): GeoParseError {
  expect(error).toBeInstanceOf(GeoParseError);
  return error as GeoParseError;
}

/** Runs a function expected to throw and returns its GeoParseError */
export function thrownBy(fn: () => unknown): GeoParseError {
  try {
    fn();
  } catch (error) {
    return asGeoParseError(error);
  }
  throw new Error("expected a throw");
}

/** Awaits a promise expected to reject and returns its GeoParseError */
export async function rejectionOf(promise: Promise<unknown>): Promise<GeoParseError> {
  try {
    await promise;
  } catch (error) {
    return asGeoParseError(error);
  }
  throw new Error("expected a rejection");
}
