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

WEEKDAYS: set[str] = {
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
}

VALID_FIELDS: set[str] = {"service_id", "start_date", "end_date"} | WEEKDAYS

EXTENDED_FIELDS: set[str] = {"service_desc"}


def header_class(field: str) -> str:
    if field in EXTENDED_FIELDS:
        return "value-extended"
    elif field in VALID_FIELDS:
        return ""
    return "value-unrecognized"


def format_cell(row: dict[str, str], field: str) -> str:
    value = row[field]

    if field in {"start_date", "end_date"}:
        if valid.date(value):
            return f"<td>{escape(value)}</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    elif field in WEEKDAYS:
        if value == "0":
            return "<td>0 (❌)</td>"
        elif value == "1":
            return "<td>1 (✔️)</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    else:
        return f"<td>{escape(value)}</td>"
