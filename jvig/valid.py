# jvig - GTFS Viewer, created using Flask.
# Copyright © 2022 Mikołaj Kuranowski

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

import datetime
import re
from math import isnan
from typing import Optional

COLOR_PATTERN = re.compile(r"^[0-9A-Fa-f]{6}$")
DATE_PATTERN = re.compile(r"^[0-9]{8}$")
TIME_PATTERN = re.compile(r"^([0-9]+):([0-9]{2}):([0-9]{2})$")

DECIMAL_PATTERN = re.compile(r"^-?[0-9]+(?:\.[0-9]+)?$")
UINT_PATTERN = re.compile(r"^[0-9]+$")


def color(text: str) -> bool:
    return not text or COLOR_PATTERN.match(text) is not None


def latitude(text: str) -> Optional[float]:
    if not DECIMAL_PATTERN.match(text):
        return None

    value = float(text)

    if isnan(value) or value > 90.0 or value < -90.0:
        return None

    return value


def longitude(text: str) -> Optional[float]:
    if not DECIMAL_PATTERN.match(text):
        return None

    value = float(text)

    if isnan(value) or value > 180.0 or value < -180.0:
        return None

    return value


def time(text: str) -> bool:
    return TIME_PATTERN.match(text) is not None


def non_negative_float(text: str) -> bool:
    return not text or (text[:1] != "-" and DECIMAL_PATTERN.match(text) is not None)


def uint(text: str) -> bool:
    return UINT_PATTERN.match(text) is not None


def date(text: str) -> bool:
    if DATE_PATTERN.match(text) is None:
        return False
    try:
        datetime.date(
            int(text[0:4]),
            int(text[4:6]),
            int(text[6:8]),
        )
        return True
    except ValueError:
        return False
