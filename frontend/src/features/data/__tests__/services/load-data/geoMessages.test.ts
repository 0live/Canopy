import i18next, { type TFunction } from "i18next";
import {
  ArchiveRejectReason,
  EpsgSource,
  ExtraDimension,
  GeoLayerIssueCode,
  GeometryType,
  GeoWarningCode,
} from "@/features/data/services/geo-parsing/core/enums";
import { GeoParseError, GeoParseErrorCode } from "@/features/data/services/geo-parsing/core/errors";
import type { GeoLayerMetadata, GeoMessageParams } from "@/features/data/services/geo-parsing/core/types";
import { layerErrors, parseErrorMessage, warningMessage } from "@/features/data/services/load-data/geoMessages";
import { GeoMetadataField } from "@/features/data/types";
import enTranslation from "@/shared/locales/en/translation.json";
import frTranslation from "@/shared/locales/fr/translation.json";

const LOCALES = { en: enTranslation, fr: frTranslation };

/** Real translations, so a missing key shows up as the raw key in the message */
function translatorFor(lng: keyof typeof LOCALES): TFunction {
  const instance = i18next.createInstance();
  void instance.init({ lng, resources: { [lng]: { translation: LOCALES[lng] } }, initImmediate: false });
  return instance.t;
}

/** Params the parsers always send with these codes */
const REQUIRED_PARAMS: Partial<Record<GeoParseErrorCode, GeoMessageParams>> = {
  [GeoParseErrorCode.MISSING_COMPONENT]: { components: ".shx, .dbf" },
  [GeoParseErrorCode.TOO_LARGE]: { maxSizeMb: 2048 },
  [GeoParseErrorCode.MULTIPLE_LAYERS]: { count: 2 },
  [GeoParseErrorCode.UNSUPPORTED_DIMENSIONS]: { dimension: ExtraDimension.Z },
  [GeoParseErrorCode.COORDINATES_OUT_OF_RANGE]: { epsg: "4326" },
};

/** One error per message variant, with the params the parsers really send */
const ERRORS: GeoParseError[] = [
  ...Object.values(GeoParseErrorCode)
    .filter((code) => code !== GeoParseErrorCode.ARCHIVE_UNSAFE)
    .map((code) => new GeoParseError(code, REQUIRED_PARAMS[code])),
  ...Object.values(ArchiveRejectReason).map((reason) => new GeoParseError(GeoParseErrorCode.ARCHIVE_UNSAFE, { reason })),
  new GeoParseError(GeoParseErrorCode.CORRUPTED, { feature: 3 }),
  new GeoParseError(GeoParseErrorCode.CORRUPTED, { component: "dbf" }),
  new GeoParseError(GeoParseErrorCode.CORRUPTED, { shapeType: 31 }),
  new GeoParseError(GeoParseErrorCode.UNSUPPORTED_DIMENSIONS, { dimension: ExtraDimension.M }),
  new GeoParseError(GeoParseErrorCode.UNSUPPORTED_DIMENSIONS, { dimension: ExtraDimension.ZM }),
  new GeoParseError(GeoParseErrorCode.UNSUPPORTED_DIMENSIONS, { dimension: ExtraDimension.Z, feature: 2 }),
];

const layer = (overrides: Partial<GeoLayerMetadata> = {}): GeoLayerMetadata => ({
  name: "communes",
  geometryType: GeometryType.POINT,
  epsg: "4326",
  epsgSource: EpsgSource.DECLARED,
  fields: [],
  featureCount: 1,
  encoding: "UTF-8",
  warnings: [],
  ...overrides,
});

describe.each(Object.keys(LOCALES) as (keyof typeof LOCALES)[])("geo messages in %s", (lng) => {
  const t = translatorFor(lng);

  it.each(ERRORS.map((error) => [error.code, error.params, error] as const))(
    "translates %s %j with its params",
    (_code, _params, error) => {
      const message = parseErrorMessage(error, t);

      expect(message).not.toMatch(/data\.load|\{\{/);
      for (const value of Object.values(error.params)) {
        if (typeof value === "number") expect(message).toContain(String(value));
      }
    },
  );

  it.each(Object.values(GeoWarningCode))("translates the %s warning", (code) => {
    expect(warningMessage({ code, params: { count: 2, fields: "a", epsg: "4326", encoding: "CP1252" } }, t)).not.toMatch(
      /data\.load|\{\{/,
    );
  });

  it("translates every layer issue", () => {
    const issueKeys = Object.values(layerErrors(layer({ geometryType: GeometryType.MIXED, epsg: null })));
    issueKeys.push(...Object.values(layerErrors(layer({ geometryType: GeometryType.UNKNOWN }))));

    expect(issueKeys).toHaveLength(Object.values(GeoLayerIssueCode).length);
    for (const key of issueKeys) expect(t(key)).not.toBe(key);
  });
});

describe("parseErrorMessage", () => {
  it("translates system values carried in params", () => {
    const t = translatorFor("fr");
    const error = new GeoParseError(GeoParseErrorCode.UNSUPPORTED_DIMENSIONS, { dimension: ExtraDimension.Z });

    expect(parseErrorMessage(error, t)).toContain(t("data.load.postgis.dimensions.z"));
  });
});

describe("layerErrors", () => {
  it("attaches each blocking issue to its metadata card", () => {
    expect(layerErrors(layer({ epsg: null, geometryType: GeometryType.MIXED }))).toEqual({
      [GeoMetadataField.EPSG]: "data.load.postgis.errors.epsgMissing",
      [GeoMetadataField.GEOMETRY_TYPE]: "data.load.postgis.errors.geometryMixed",
    });
  });

  it("does not block a layer without fields", () => {
    expect(layerErrors(layer({ fields: [] }))).toEqual({});
  });

  it("has nothing to report without a layer", () => {
    expect(layerErrors(undefined)).toEqual({});
  });
});
