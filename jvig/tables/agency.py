VALID_FIELDS: set[str] = {
    "agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang", "agency_phone",
    "agency_fare_url", "agency_email"
}


def header_class(field: str) -> str:
    return "" if field in VALID_FIELDS else "value-unrecognized"
