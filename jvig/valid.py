import re
from math import isnan
from typing import Optional

COLOR_PATTERN = re.compile(r"^[0-9A-Fa-f]{6}$")
DATE_PATTERN = re.compile(r"^[0-9]{8}$")
TIME_PATTERN = re.compile(r"^([0-9]{1,}):([0-9]{2}):([0-9]{2})$")
DECIMAL_PATTERN = re.compile(r"^-?[0-9]+(?:\.[0-9]+)?$")


def color(text: str) -> bool:
    return not color or COLOR_PATTERN.match(text) is not None


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