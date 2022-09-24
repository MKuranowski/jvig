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

from datetime import date
from typing import Any, Hashable, Iterable, TypeVar

from jinja2 import is_undefined

T = TypeVar("T")
THashable = TypeVar("THashable", bound=Hashable)


def time_to_int(time: str) -> int:
    try:
        h, m, s = map(int, time.split(":"))
        return h * 3600 + m * 60 + s
    except ValueError:
        return -1


def sequence_to_int(text: str) -> int:
    try:
        return int(text)
    except ValueError:
        return -1


def to_js_literal(obj: Any) -> str:
    if obj is None:
        return "null"

    elif is_undefined(obj):
        return "undefined"

    elif isinstance(obj, str):
        # FIXME: Figure out if this is actually a safe way to pass a string to JS
        return repr(obj)

    elif isinstance(obj, int):
        return str(obj)

    else:
        raise ValueError(f"Unsupported conversion to JS literal from {type(obj).__name__}")


def parse_gtfs_date(x: str) -> date:
    """Parses a GTFS date string ("%Y%m%d") into a datetime.date instance.
    Faster than `datetime.strptime(x, "%Y%m%d").date()`.
    """
    return date(int(x[0:4]), int(x[4:6]), int(x[6:8]))


def unique_list(it: Iterable[THashable]) -> list[THashable]:
    """Similar to `list(it)`, except that duplicate entries are removed.
    In other words, similar to `list(set(it))`, except that order of elements is preserved.
    """
    seen: set[THashable] = set()
    lst: list[THashable] = []

    for i in it:
        if i not in seen:
            seen.add(i)
            lst.append(i)

    return lst
