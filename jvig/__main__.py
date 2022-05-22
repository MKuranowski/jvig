import argparse
from bisect import insort
from pathlib import Path
from typing import Optional

from flask import Flask, jsonify, render_template
from flask.wrappers import Response

from .gtfs import Gtfs, Row
from .tables import agency, routes, stops, times, trips
from .util import time_to_int

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
app.jinja_env.globals["routes_format_cell"] = routes.format_cell
app.jinja_env.globals["stops_header_class"] = stops.header_class
app.jinja_env.globals["stops_format_cell"] = stops.format_cell
app.jinja_env.globals["trips_header_class"] = trips.header_class
app.jinja_env.globals["trips_format_cell"] = trips.format_cell
app.jinja_env.globals["times_header_class"] = times.header_class
app.jinja_env.globals["times_format_cell"] = times.format_cell

# Helper functions
app.jinja_env.globals["repr"] = lambda x: repr(x)
app.jinja_env.globals["trip_first_time"] = lambda trip_id: \
    gtfs.stop_times[trip_id][0]["departure_time"]
app.jinja_env.globals["trip_last_time"] = lambda trip_id: \
    gtfs.stop_times[trip_id][-1]["departure_time"]


# HTML routes

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


@app.route("/stops")
def route_stops() -> str:
    return render_template(
        "stops.html.jinja",
        missing=not gtfs.stops,
        header=gtfs.header_of("stops"),
        data=gtfs.stops.values(),
    )


@app.route("/route/<path:route_id>")
@app.route("/block/<path:block_id>")
def route_trips(route_id: Optional[str] = None, block_id: Optional[str] = None) -> str:
    if route_id:
        data = filter(lambda row: row["route_id"] == route_id, gtfs.trips.values())
    elif block_id:
        data = filter(lambda row: row["block_id"] == route_id, gtfs.trips.values())
    else:
        raise RuntimeError("Trips view must be filtered by either a block_id or route_id")

    return render_template(
        "trips.html.jinja",
        missing=not gtfs.trips,
        header=gtfs.header_of("trips"),
        data=data,
    )


@app.route("/stop/<path:stop_id>")
def route_stop(stop_id: str) -> str:
    # Special case for missing stops
    if stop_id not in gtfs.stops:
        return render_template(
            "stop.html.jinja",
            missing=True,
            stop={"stop_id": stop_id},
        )

    stop = gtfs.stops[stop_id]

    # Gather the stop_times of this stop,
    # and their trip_short_names and trip_headsigns
    times_by_service: dict[str, list[Row]] = {}
    trip_short_names: Optional[dict[str, str]] = \
        {} if "trip_short_name" in gtfs.header_of("trips") else None
    trip_headsigns: Optional[dict[str, str]] = \
        {} if "trip_headsign" in gtfs.header_of("trips") else None

    for time in gtfs.stop_times_by_stops.get(stop_id, []):
        if time["trip_id"] not in gtfs.trips:
            continue
        trip = gtfs.trips[time["trip_id"]]

        # Keep the list sorted by departure_time
        insort(
            times_by_service.setdefault(trip["service_id"], []),
            time,
            key=lambda t: time_to_int(t.get("departure_time", ""))
        )

        if trip_short_names is not None:
            trip_short_names[trip["trip_id"]] = trip["trip_short_name"]
        if trip_headsigns is not None:
            trip_headsigns[trip["trip_id"]] = trip["trip_headsign"]

    # Calculate colspan
    colspan = len(gtfs.header_of("stop_times"))
    colspan += trip_short_names is not None
    colspan += trip_headsigns is not None

    # Render the template
    return render_template(
        "stop.html.jinja",
        missing=False,
        stop=stop,
        stops_header=gtfs.header_of("stops"),
        stops_in_group=gtfs.all_stops_in_group(stop_id),
        times_header=gtfs.header_of("stop_times"),
        times_by_service=times_by_service,
        trip_short_names=trip_short_names,
        trip_headsigns=trip_headsigns,
        times_colspan=colspan,
    )


# JSON routes for map presentation

@app.route("/api/map/stops")
def route_api_map_stops() -> Response:
    return jsonify([
        {
            "id": stop.get("stop_id"),
            "code": stop.get("stop_code"),
            "name": stop.get("stop_name"),
            "lat": stop.get("stop_lat"),
            "lon": stop.get("stop_lon"),
        }
        for stop in gtfs.stops.values()
    ])


@app.route("/api/map/stop/<path:stop_id>")
def route_api_map_stop(stop_id: str) -> Response:
    return jsonify([
        {
            "idx": idx,
            "id": stop.get("stop_id"),
            "code": stop.get("stop_code"),
            "name": stop.get("stop_name"),
            "lat": stop.get("stop_lat"),
            "lon": stop.get("stop_lon"),
        }
        for idx, stop in enumerate(gtfs.all_stops_in_group(stop_id))
    ])


# Go!
app.run()
