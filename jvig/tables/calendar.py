from markupsafe import escape

from .. import valid

WEEKDAYS: set[str] = {
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
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
