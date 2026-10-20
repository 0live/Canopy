class PostgresLimit:
    # NAMEDATALEN - 1: longer identifiers are silently truncated by PostgreSQL
    IDENTIFIER_MAX_LENGTH = 63


class LayerTableColumn:
    """Technical columns every imported table gets, whatever the source file"""

    FID = "fid"
    GEOMETRY = "geom"
