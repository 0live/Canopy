"""Regenerates the .prj fixtures: 2 EPSG codes x 3 WKT flavours (ESRI, GDAL WKT1, WKT2).

Usage: python generate.py <output_dir>   (requires pyproj)
ESRI flavour carries no AUTHORITY: it exercises the API fallback. It is byte-identical to
the .prj written by QGIS 3.34 / GDAL 3.8 (Shapefile driver), i.e. the most common real-world case.
"""
import sys
from pathlib import Path

from pyproj import CRS
from pyproj.enums import WktVersion

out = Path(sys.argv[1])
VARIANTS = {"esri": WktVersion.WKT1_ESRI, "gdal": WktVersion.WKT1_GDAL, "wkt2": WktVersion.WKT2_2019}
# One geographic (GEOGCS root) and one projected CRS (PROJCS with nested GEOGCS)
for code in (4326, 2154):
    crs = CRS.from_epsg(code)
    for name, ver in VARIANTS.items():
        (out / f"{code}_{name}.prj").write_text(crs.to_wkt(ver))
