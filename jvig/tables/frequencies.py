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

from urllib.parse import quote_plus

from markupsafe import escape

from .. import valid

VALID_FIELDS: set[str] = {
    "trip_id",
    "start_time",
    "end_time",
    "headway_secs",
    "exact_times",
}


def header_class(field: str) -> str:
    return "" if field in VALID_FIELDS else "value-unrecognized"


def format_cell(row: dict[str, str], field: str) -> str:
    value = row[field]

    if field == "trip_id":
        return f'<td><a href="/trip/{quote_plus(value)}">{escape(value)}</a></td>'

    elif field in {"start_time", "end_time"}:
        if valid.time(value):
            return f"<td>{escape(value)}</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    elif field == "headway_secs":
        if valid.uint(value) and value != "0":
            return f"<td>{escape(value)}</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    elif field == "exact_times":
        if value == "":
            return "<td></td>"
        elif value == "0":
            return "<td>0 (🤷)</td>"
        elif value == "1":
            return "<td>1 (📌)</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    else:
        return f"<td>{escape(value)}</td>"
