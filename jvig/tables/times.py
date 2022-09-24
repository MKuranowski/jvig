from urllib.parse import quote_plus

from markupsafe import escape

from .. import valid

VALID_FIELDS: set[str] = {
    "trip_id",
    "arrival_time",
    "departure_time",
    "stop_id",
    "stop_sequence",
    "stop_headsign",
    "pickup_type",
    "drop_off_type",
    "shape_dist_traveled",
    "timepoint",
}


def header_class(field: str) -> str:
    return "" if field in VALID_FIELDS else "value-unrecognized"


def format_cell(row: dict[str, str], field: str) -> str:
    value = row[field]

    if field == "trip_id":
        return f'<td><a href="/trip/{quote_plus(value)}">{escape(value)}</a></td>'

    elif field in {"arrival_time", "departure_time"}:
        if valid.time(value):
            return f"<td>{escape(value)}</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    elif field == "stop_id":
        return f'<td><a href="/stop/{quote_plus(value)}">{escape(value)}</a></td>'

    elif field == "stop_sequence":
        if valid.uint(value):
            return f"<td>{escape(value)}</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    elif field in {"pickup_type", "drop_off_type"}:
        if value == "":
            return "<td></td>"
        elif value == "0":
            return "<td>0 (🚏)</td>"
        elif value == "1":
            return "<td>1 (🚫)</td>"
        elif value == "2":
            return "<td>2 (☎️)</td>"
        elif value == "3":
            return "<td>3 (👈)</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    elif field == "shape_dist_traveled":
        if valid.non_negative_float(value):
            return f"<td>{escape(value)}</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    elif field == "timepoint":
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
