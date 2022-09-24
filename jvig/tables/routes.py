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
    "route_id",
    "agency_id",
    "route_short_name",
    "route_long_name",
    "route_type",
    "route_desc",
    "route_url",
    "route_color",
    "route_text_color",
    "route_sort_order",
}

ROUTE_TYPE_DATA: dict[str, tuple[str, bool]] = {
    "0": ("🚊", False),
    "1": ("🚇", False),
    "2": ("🚆", False),
    "3": ("🚌", False),
    "4": ("⛴️", False),
    "5": ("🚋", False),
    "6": ("🚠", False),
    "7": ("🚞", False),
    "11": ("🚎", False),
    "12": ("🚝", False),
    "100": ("🚆", True),
    "101": ("🚅", True),
    "102": ("🚆", True),
    "103": ("🚆", True),
    "105": ("🚆", True),
    "106": ("🚆", True),
    "107": ("🚂", True),
    "108": ("🚆", True),
    "109": ("🚆", True),
    "200": ("🚌", True),
    "201": ("🚌", True),
    "202": ("🚌", True),
    "204": ("🚌", True),
    "400": ("🚇", True),
    "401": ("🚇", True),
    "402": ("🚇", True),
    "403": ("🚇", True),
    "405": ("🚝", True),
    "700": ("🚍", True),
    "701": ("🚍", True),
    "702": ("🚍", True),
    "704": ("🚍", True),
    "715": ("🚍", True),
    "717": ("🚐", True),
    "800": ("🚎", True),
    "900": ("🚊", True),
    "907": ("🚋", True),
    "1000": ("⛴️", True),
    "1300": ("🚠", True),
    "1400": ("🚞", True),
    "1700": ("❓", True),
}


def header_class(field: str) -> str:
    return "" if field in VALID_FIELDS else "value-unrecognized"


def format_cell(row: dict[str, str], field: str) -> str:
    value = row[field]

    if field in {"route_color", "route_text_color"}:
        if valid.color(value):
            return f"<td>{escape(value)}</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    elif field == "route_type":
        if value not in ROUTE_TYPE_DATA:
            return f'<td class="value-invalid">{escape(value)}</td>'

        icon, is_extended = ROUTE_TYPE_DATA[value]
        if is_extended:
            return f'<td class="value-extended">{escape(value)} ({icon})</td>'
        else:
            return f"<td>{escape(value)} ({icon})</td>"

    elif field == "route_short_name":
        color = row.get("route_color")
        text_color = row.get("route_text_color")

        # To create a nice color blob we need valid colors
        if not color or not text_color or not valid.color(color) or not valid.color(text_color):
            return f"<td>{escape(value)}</td>"

        style = (
            f"background-color: #{color}; color: #{text_color}; "
            "border-radius: 4px; padding: 2px; margin: 2px;"
        )

        if value == "":
            style += " display: block; width: 14px; height: 14px;"

        return (
            f'<td class="short-name-with-blob"><span style="{style}">'
            f"{escape(value)}</style></td>"
        )

    else:
        return f"<td>{escape(value)}</td>"
