import shutil

import pytest

# The API runs GDAL as command-line tools; skip on hosts that lack them
requires_gdal = pytest.mark.skipif(
    shutil.which("ogr2ogr") is None or shutil.which("ogrinfo") is None,
    reason="GDAL command-line tools are not installed",
)
