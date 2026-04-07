from enum import Enum


class ExportTarget(str, Enum):
    POSTGIS = "postgis"
    PMTILES = "pmtiles"


class AllowedGeoExtension(str, Enum):
    GEOJSON = ".geojson"
    JSON = ".json"
    ZIP = ".zip"
