#!/usr/bin/env bash
# Regenerates the Shapefile fixtures with ogr2ogr (GDAL 3.8): 2 features each, field names
# with an accent to check their decoding.
#   points_latin1: GDAL defaults (LDID 87 = ISO-8859-1, no .cpg, ESRI .prj without EPSG code)
#   lines_utf8:    UTF-8 with a .cpg, as written by QGIS
# Usage: ./generate.sh <output_dir>
set -euo pipefail
out="$1"
feature() { echo "{\"type\":\"Feature\",\"properties\":{\"région\":\"$1\",\"pop\":$2},\"geometry\":$3}"; }
collection() { echo "{\"type\":\"FeatureCollection\",\"features\":[$1,$2]}"; }

collection "$(feature Normandie 12 '{"type":"Point","coordinates":[1.1,49.0]}')" \
  "$(feature Bretagne 7 '{"type":"Point","coordinates":[-2.7,48.1]}')" > "$out/points.geojson"
collection "$(feature Normandie 12 '{"type":"LineString","coordinates":[[1,49],[2,49]]}')" \
  "$(feature Bretagne 7 '{"type":"LineString","coordinates":[[-3,48],[-2,48]]}')" > "$out/lines.geojson"

ogr2ogr -f "ESRI Shapefile" -a_srs EPSG:4326 "$out/points_latin1" "$out/points.geojson" -nln points_latin1
ogr2ogr -f "ESRI Shapefile" -a_srs EPSG:2154 -lco ENCODING=UTF-8 "$out/lines_utf8" "$out/lines.geojson" -nln lines_utf8
rm "$out"/*.geojson
