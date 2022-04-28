import argparse
from pathlib import Path
from typing import Optional

from flask import Flask, render_template

from .gtfs import Gtfs
from .tables import agency, routes

# Parse the argument
arg_parser = argparse.ArgumentParser()
arg_parser.add_argument("file", type=Path, help="path to GTFS directory/zip")
args = arg_parser.parse_args()

# Load GTFS data
gtfs = Gtfs.from_user_input(args.file)

# Create the Flask application
app = Flask(__name__)

# Apply template filters
app.jinja_env.globals["agency_header_class"] = agency.header_class
app.jinja_env.globals["routes_header_class"] = routes.header_class
app.jinja_env.globals["route_format_row"] = routes.format_row


# Apply routes

@app.route("/")
@app.route("/agency")
def route_agency() -> str:
    return render_template(
        "agency.html.jinja",
        missing=not gtfs.agency,
        header=gtfs.header_of("agency"),
        data=gtfs.agency.values(),
    )


@app.route("/agency/<path:agency_id>")
@app.route("/routes")
def route_routes(agency_id: Optional[str] = None) -> str:
    if agency_id:
        data = filter(lambda row: row["agency_id"] == agency_id, gtfs.routes.values())
    else:
        data = gtfs.routes.values()

    return render_template(
        "routes.html.jinja",
        missing=not gtfs.routes,
        header=gtfs.header_of("routes"),
        data=data,
    )


# Go!
app.run()
