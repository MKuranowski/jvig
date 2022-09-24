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

VALID_FIELDS: set[str] = {
    "route_id",
    "service_id",
    "trip_id",
    "trip_headsign",
    "trip_short_name",
    "direction_id",
    "block_id",
    "shape_id",
    "wheelchair_accessible",
    "bikes_allowed",
}

EXTENDED_FIELDS: set[str] = {"exceptional"}


def header_class(field: str) -> str:
    if field in EXTENDED_FIELDS:
        return "value-extended"
    elif field in VALID_FIELDS:
        return ""
    return "value-unrecognized"


def format_cell(row: dict[str, str], field: str) -> str:
    value = row[field]

    if field == "route_id":
        return f'<td><a href="/route/{quote_plus(value)}">{escape(value)}</a></td>'

    elif field == "service_id":
        return f'<td><a href="/calendar/{quote_plus(value)}">{escape(value)}</a></td>'

    elif field in {"direction_id", "exceptional"}:
        if value in {"0", "1"}:
            return f"<td>{escape(value)}</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    elif field == "block_id":
        return f'<td><a href="/block/{quote_plus(value)}">{escape(value)}</a></td>'

    elif field == "wheelchair_accessible":
        if value == "":
            return "<td></td>"
        elif value == "0":
            return "<td>0 (♿❓)</td>"
        elif value == "1":
            return "<td>1 (♿✔️)</td>"
        elif value == "2":
            return "<td>2 (♿❌)</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    elif field == "bikes_allowed":
        if value == "":
            return "<td></td>"
        elif value == "0":
            return "<td>0 (🚲❓)</td>"
        elif value == "1":
            return "<td>1 (🚲✔️)</td>"
        elif value == "2":
            return "<td>2 (🚲❌)</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    else:
        return f"<td>{escape(value)}</td>"
