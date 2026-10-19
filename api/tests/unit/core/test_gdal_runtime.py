import re
import subprocess

import pytest

from tests.helpers.gdal import requires_gdal

# ogrinfo -json, used to re-check uploaded files, appeared in GDAL 3.7
MIN_GDAL_VERSION = (3, 7)
REQUIRED_DRIVERS = ["PostgreSQL", "GeoJSON", "ESRI Shapefile"]


def _run(*args: str) -> str:
    return subprocess.run(
        args, capture_output=True, text=True, check=True, timeout=30
    ).stdout


@requires_gdal
class TestGdalRuntime:
    @pytest.mark.parametrize("tool", ["ogr2ogr", "ogrinfo"])
    def test_tool_is_recent_enough(self, tool):
        match = re.search(r"GDAL (\d+)\.(\d+)", _run(tool, "--version"))
        assert match is not None
        assert (int(match[1]), int(match[2])) >= MIN_GDAL_VERSION

    @pytest.mark.parametrize("driver", REQUIRED_DRIVERS)
    def test_vector_driver_is_available(self, driver):
        # ogrinfo --formats lists one driver per line: "  GeoJSON -vector- (rw+v): GeoJSON"
        pattern = rf"^\s*{re.escape(driver)} -vector- "
        assert re.search(pattern, _run("ogrinfo", "--formats"), re.MULTILINE)
