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

from markupsafe import escape

from .. import valid

VALID_FIELDS: set[str] = {
    "stop_id",
    "stop_code",
    "stop_name",
    "stop_desc",
    "stop_lat",
    "stop_lon",
    "zone_id",
    "stop_url",
    "location_type",
    "parent_station",
    "stop_timezone",
    "wheelchair_boarding",
    "platform_code",
}


def header_class(field: str) -> str:
    return "" if field in VALID_FIELDS else "value-unrecognized"


def format_cell(row: dict[str, str], field: str) -> str:
    value = row[field]

    if field == "stop_lat":
        if valid.latitude(value) is not None:
            return f"<td>{escape(value)}</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    elif field == "stop_lon":
        if valid.longitude(value) is not None:
            return f"<td>{escape(value)}</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    elif field == "location_type":
        if value == "":
            return "<td></td>"
        elif value == "0":
            return "<td>0 (🚏)</td>"
        elif value == "1":
            return "<td>1 (🏢)</td>"
        elif value == "2":
            return "<td>2 (➡️🚪)</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    elif field == "wheelchair_boarding":
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

    else:
        return f"<td>{escape(value)}</td>"
