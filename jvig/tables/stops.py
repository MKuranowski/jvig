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
