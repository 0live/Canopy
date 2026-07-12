---
sidebar_position: 6
---

# Glossary

Geospatial and project-specific terms, so a new contributor can navigate the
codebase quickly.

## Geospatial

- **PostGIS** — spatial extension for PostgreSQL adding geometry/geography types
  and spatial indexing. Canopy uses image `postgis/postgis:16-3.4`.
- **Vector tile** — a compact, tiled binary representation of vector geometry
  (MVT / `.pbf`) rendered client-side, as opposed to pre-rendered raster tiles.
- **Martin** — a tile server that generates vector tiles **directly from
  PostGIS** tables/functions and exposes them (catalog at `/catalog`). Wired as
  the `martin` service.
- **MapLibre GL** — open-source WebGL map renderer (the MapLibre "style" is the
  JSON that tells it how to draw sources/layers). Canopy stores a style string
  on each `Map`. Note: the **frontend does not yet embed a MapLibre map**.
- **Maputnik** — visual editor for MapLibre GL styles, served at `/editor/`.
- **PMTiles** — single-file archive format for map tiles. Referenced by the
  `ExportTarget.PMTILES` enum as a planned import target (not implemented yet).
- **EPSG code** — a numeric identifier for a coordinate reference system (e.g.
  `EPSG:4326` = WGS84 lon/lat). `POST /api/geo/detect-epsg` derives it from a
  WKT string via `pyproj`.
- **CRS / WKT** — Coordinate Reference System; WKT ("Well-Known Text") is a
  textual description of a CRS/projection.
- **GeoJSON / Shapefile** — vector data formats accepted by the upload endpoint
  (`.geojson`, `.json`, `.zip`). The frontend parses them client-side with
  `loaders.gl`.

## Canopy domain

- **Atlas** — a named collection of Maps. Shared to Teams via `AtlasTeamLink`
  with granular flags (`can_manage_atlas`, `can_create_maps`, `can_edit_maps`).
- **Map** — a named entity inside an Atlas, carrying a `description` and a
  MapLibre `style`. Unique per `(atlas_id, name)`.
- **Team** — a group of Users; the unit that Atlases are shared with.
- **Role** — a value of `UserRole` (a user has an **array** of roles):
  `ADMIN`, `USER`, `MANAGE_TEAMS`, `MANAGE_ATLASES_AND_MAPS`, `LOAD_DATA`,
  `LOAD_ICONS`, `WITHDBACCESS`.
- **Access policy** — visibility of an Atlas/Map/Team via `AccessPolicy`:
  `standard` (private, shareable to teams), `internal` (all registered users),
  `public` (everyone).
- **DB access provisioning** — granting a user their own PostgreSQL role
  (`canopy_user_<id>`) so they can connect to PostGIS directly. Gated by the
  `WITHDBACCESS` role. See [Database access](./api/database-access).
- **Activation token** — one-time token issued when `WITHDBACCESS` is granted;
  the user redeems it (within 8h) to set their PostgreSQL role password.

## Infrastructure

- **PgBouncer** — connection pooler between the API/Martin and PostGIS
  (transaction pooling, SCRAM-SHA-256 auth). Requires `prepare_threshold=0` on
  the API connection.
- **SCRAM-SHA-256** — password authentication mechanism used for PostgreSQL
  roles; helpers live in `app/core/scram.py`.
- **Caddy** — reverse proxy and automatic HTTPS; single public entry point.
- **Mailpit** — dev-only SMTP sink with a web UI to inspect outgoing email.
- **Altcha** — privacy-friendly proof-of-work captcha used on registration.
- **`expose-db` profile** — optional compose profile that publishes PostGIS to
  the host (via a `socat` relay) for external SQL clients.
