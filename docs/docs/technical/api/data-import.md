---
sidebar_position: 6
---

# Data Import

:::caution Status: partial
The geo-import pipeline is **not complete**. Today the backend only accepts and
**stores the uploaded file on disk** — it does **not** yet load data into PostGIS
or produce PMTiles. EPSG detection works. This page documents exactly what
exists so contributors know where to continue.
:::

Source: `app/modules/geo/` and `app/modules/import_data/`.

## EPSG detection — `POST /geo/detect-epsg`

Working. Derives an EPSG code from a WKT projection string using `pyproj`.

```http
POST /api/geo/detect-epsg
{ "wkt": "GEOGCS[\"WGS 84\", ...]" }
```

Response:

```json
{ "epsg": "EPSG:4326" }   // or { "epsg": null } if it can't be resolved
```

Requires the `ADMIN` or `LOAD_DATA` role.

## File upload — `POST /import-data/upload`

Working, but only persists the file.

- Multipart form field `file` (an `UploadFile`).
- Allowed extensions (`AllowedGeoExtension`): `.geojson`, `.json`, `.zip`
  (Shapefile archive).
- Requires the `ADMIN` or `LOAD_DATA` role.
- The file is written to `\{UPLOADS_DIR}/\{upload_id}/\{filename}` (default
  `UPLOADS_DIR=/tmp/canopy_uploads`, a per-upload UUID directory).

Response (`FileUploadResponse`):

```json
{ "upload_id": "3f2b...", "filename": "cities.geojson", "size": 123456 }
```

## What is defined but not wired yet

`import_data/schemas.py` and `enums.py` already sketch the intended next steps,
but no endpoint/service implements them:

- `GeofileToDbRequest` — `layer_name` + per-field `FieldImportSettings`
  (`include`, `index`), i.e. choosing which attributes to import and index.
- `GeofileImportResponse` — result of an actual DB import.
- `ExportTarget` enum — `postgis` and `pmtiles` as planned import/export targets.

So the intended flow (upload → choose fields/EPSG → import into `users_data` /
serve via Martin) is only partially built. The **frontend** side already parses
geo files client-side with `loaders.gl` and shows metadata (see the `data`
feature), ahead of the backend import.
