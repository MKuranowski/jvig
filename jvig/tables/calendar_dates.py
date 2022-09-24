from markupsafe import escape

from .. import valid

VALID_FIELDS: set[str] = {"service_id", "date", "exception_type"}


def header_class(field: str) -> str:
    return "" if field in VALID_FIELDS else "value-unrecognized"


def format_cell(row: dict[str, str], field: str) -> str:
    value = row[field]

    if field == "date":
        if valid.date(value):
            return f"<td>{escape(value)}</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    elif field == "exception_type":
        if value == "1":
            return "<td>1 (+)</td>"
        elif value == "2":
            return "<td>2 (-)</td>"
        else:
            return f'<td class="value-invalid">{escape(value)}</td>'

    else:
        return f"<td>{escape(value)}</td>"
