export const DataLoadTab = {
  POSTGIS: "postgis",
  PMTILES: "pmtiles",
} as const;

export const DATA_LOAD_TABS = Object.values(DataLoadTab) as DataLoadTab[];

export type DataLoadTab = (typeof DataLoadTab)[keyof typeof DataLoadTab];
