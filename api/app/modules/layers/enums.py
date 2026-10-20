from enum import Enum


class LayerStatus(str, Enum):
    """Lifecycle of an imported layer; failed imports leave no row behind"""

    QUEUED = "QUEUED"
    IMPORTING = "IMPORTING"
    READY = "READY"


class LayerGeometryType(str, Enum):
    """Geometry types a layer table can hold, named like the frontend parser"""

    POINT = "Point"
    LINESTRING = "LineString"
    POLYGON = "Polygon"
    MULTIPOINT = "MultiPoint"
    MULTILINESTRING = "MultiLineString"
    MULTIPOLYGON = "MultiPolygon"
