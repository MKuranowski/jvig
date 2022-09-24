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

import argparse
from pathlib import Path
from typing import Any, Optional

from flask import Flask, jsonify, render_template
from flask.wrappers import Response

from .gtfs import Gtfs, Row
from .tables import agency, calendar, calendar_dates, frequencies, routes, stops, times, trips
from .util import sequence_to_int, time_to_int, to_js_literal


class Application:
    def __init__(self, gtfs: Gtfs) -> None:
        self.gtfs = gtfs
        self.flask = Flask(__name__)
        self._init_app()

    def _init_app(self) -> None:
        self._init_template_functions()
        self._init_html_routes()
        self._init_api_routes()

    def _init_template_functions(self) -> None:
        # Apply template filters
        self.flask.add_template_global(agency.header_class, "agency_header_class")
        self.flask.add_template_global(routes.header_class, "routes_header_class")
        self.flask.add_template_global(routes.format_cell, "routes_format_cell")
        self.flask.add_template_global(stops.header_class, "stops_header_class")
        self.flask.add_template_global(stops.format_cell, "stops_format_cell")
        self.flask.add_template_global(trips.header_class, "trips_header_class")
        self.flask.add_template_global(trips.format_cell, "trips_format_cell")
        self.flask.add_template_global(times.header_class, "times_header_class")
        self.flask.add_template_global(times.format_cell, "times_format_cell")
        self.flask.add_template_global(frequencies.header_class, "frequencies_header_class")
        self.flask.add_template_global(frequencies.format_cell, "frequencies_format_cell")
        self.flask.add_template_global(calendar.header_class, "calendar_header_class")
        self.flask.add_template_global(calendar.format_cell, "calendar_format_cell")
        self.flask.add_template_global(calendar_dates.header_class, "calendar_dates_header_class")
        self.flask.add_template_global(calendar_dates.format_cell, "calendar_dates_format_cell")

        # Helper functions
        self.flask.add_template_global(to_js_literal, "to_js_literal")
        self.flask.add_template_global(
            lambda trip_id: self.gtfs.stop_times[trip_id][0]["departure_time"],
            "trip_first_time",
        )
        self.flask.add_template_global(
            lambda trip_id: self.gtfs.stop_times[trip_id][-1]["departure_time"],
            "trip_last_time",
        )

    def _init_html_routes(self) -> None:
        self.flask.add_url_rule("/", view_func=self.route_agency)
        self.flask.add_url_rule("/agency", view_func=self.route_agency)
        self.flask.add_url_rule("/agency/<path:agency_id>", view_func=self.route_routes)
        self.flask.add_url_rule("/routes", view_func=self.route_routes)
        self.flask.add_url_rule("/stops", view_func=self.route_stops)
        self.flask.add_url_rule("/route/<path:route_id>", view_func=self.route_trips)
        self.flask.add_url_rule("/block/<path:block_id>", view_func=self.route_trips)
        self.flask.add_url_rule("/stop/<path:stop_id>", view_func=self.route_stop)
        self.flask.add_url_rule("/trip/<path:trip_id>", view_func=self.route_trip)
        self.flask.add_url_rule("/calendars", view_func=self.route_calendars)
        self.flask.add_url_rule("/calendar/<path:service_id>", view_func=self.route_calendar)

    def _init_api_routes(self) -> None:
        self.flask.add_url_rule("/api/map/stops", view_func=self.route_api_map_stops)
        self.flask.add_url_rule("/api/map/stop/<path:stop_id>", view_func=self.route_api_map_stop)
        self.flask.add_url_rule("/api/map/trip/<path:trip_id>", view_func=self.route_api_map_trip)
        self.flask.add_url_rule(
            "/api/map/shape/<path:shape_id>",
            view_func=self.route_api_map_shape,
        )
        self.flask.add_url_rule(
            "/api/calendar/days/<path:service_id>",
            view_func=self.route_api_calendar_dates,
        )

    # HTML routes

    def route_agency(self) -> str:
        return render_template(
            "agency.html.jinja",
            missing=not self.gtfs.agency,
            header=self.gtfs.header_of("agency"),
            data=self.gtfs.agency.values(),
        )

    def route_routes(self, agency_id: Optional[str] = None) -> str:
        if agency_id:
            data = filter(lambda row: row["agency_id"] == agency_id, self.gtfs.routes.values())
        else:
            data = self.gtfs.routes.values()

        return render_template(
            "routes.html.jinja",
            missing=not self.gtfs.routes,
            header=self.gtfs.header_of("routes"),
            data=data,
        )

    def route_stops(self) -> str:
        return render_template(
            "stops.html.jinja",
            missing=not self.gtfs.stops,
            header=self.gtfs.header_of("stops"),
            data=self.gtfs.stops.values(),
        )

    def route_trips(self, route_id: Optional[str] = None, block_id: Optional[str] = None) -> str:
        if route_id:
            data = filter(lambda row: row["route_id"] == route_id, self.gtfs.trips.values())
        elif block_id:
            data = filter(lambda row: row["block_id"] == route_id, self.gtfs.trips.values())
        else:
            raise RuntimeError("Trips view must be filtered by either a block_id or route_id")

        return render_template(
            "trips.html.jinja",
            missing=not self.gtfs.trips,
            header=self.gtfs.header_of("trips"),
            data=data,
        )

    def route_stop(self, stop_id: str) -> str:
        # Special case for missing stops
        if stop_id not in self.gtfs.stops:
            return render_template(
                "stop.html.jinja",
                missing=True,
                stop={"stop_id": stop_id},
            )

        stop = self.gtfs.stops[stop_id]

        # Gather the stop_times of this stop,
        # and their trip_short_names and trip_headsigns
        times_by_service: dict[str, list[Row]] = {}
        trip_short_names: Optional[dict[str, str]] = (
            {} if "trip_short_name" in self.gtfs.header_of("trips") else None
        )
        trip_headsigns: Optional[dict[str, str]] = (
            {} if "trip_headsign" in self.gtfs.header_of("trips") else None
        )

        for time in self.gtfs.stop_times_by_stops.get(stop_id, []):
            if time["trip_id"] not in self.gtfs.trips:
                continue
            trip = self.gtfs.trips[time["trip_id"]]

            times_by_service.setdefault(trip["service_id"], []).append(time)

            if trip_short_names is not None:
                trip_short_names[trip["trip_id"]] = trip["trip_short_name"]
            if trip_headsigns is not None:
                trip_headsigns[trip["trip_id"]] = trip["trip_headsign"]

        # Ensure times_by_service are ordered by the departure time
        for lst in times_by_service.values():
            lst.sort(key=lambda t: time_to_int(t.get("departure_time", "")))

        # Calculate colspan
        colspan = len(self.gtfs.header_of("stop_times"))
        colspan += trip_short_names is not None
        colspan += trip_headsigns is not None

        # Render the template
        return render_template(
            "stop.html.jinja",
            missing=False,
            stop=stop,
            stops_header=self.gtfs.header_of("stops"),
            stops_in_group=self.gtfs.all_stops_in_group(stop_id),
            times_header=self.gtfs.header_of("stop_times"),
            times_by_service=times_by_service,
            trip_short_names=trip_short_names,
            trip_headsigns=trip_headsigns,
            times_colspan=colspan,
        )

    def route_trip(self, trip_id: str) -> str:
        # Short circuit for missing trips
        if trip_id not in self.gtfs.trips:
            return render_template(
                "trip.html.jinja",
                missing=True,
                trip={"trip_id": trip_id},
            )

        # Prepare data for rendering
        trip = self.gtfs.trips[trip_id]
        times = sorted(
            self.gtfs.stop_times.get(trip_id, []),
            key=lambda r: sequence_to_int(r.get("stop_sequence", "")),
        )

        stop_names = [
            self.gtfs.stops.get(i.get("stop_id", ""), {}).get("stop_name", "") for i in times
        ]

        return render_template(
            "trip.html.jinja",
            missing=False,
            trip=trip,
            trips_header=self.gtfs.header_of("trips"),
            times=times,
            times_header=self.gtfs.header_of("stop_times"),
            stop_names=stop_names,
            frequencies=self.gtfs.frequencies.get(trip_id),
            frequencies_header=self.gtfs.header_of("frequencies"),
        )

    def route_calendars(self) -> str:
        return render_template(
            "calendars.html.jinja",
            missing=(not self.gtfs.calendar) and (not self.gtfs.calendar_dates),
            header=self.gtfs.header_of("calendar"),
            data=self.gtfs.calendar.values(),
            implicit_calendars=[
                i for i in self.gtfs.calendar_dates if i not in self.gtfs.calendar
            ],
        )

    def route_calendar(self, service_id: str) -> str:
        missing = (
            service_id not in self.gtfs.calendar and service_id not in self.gtfs.calendar_dates
        )

        return render_template(
            "calendar.html.jinja",
            service_id=service_id,
            missing=missing,
            calendar_row=self.gtfs.calendar.get(service_id),
            calendar_header=self.gtfs.header_of("calendar"),
            calendar_dates_rows=self.gtfs.calendar_dates.get(service_id),
            calendar_dates_header=self.gtfs.header_of("calendar_dates"),
        )

    # JSON routes for map presentation

    def route_api_map_stops(self) -> Response:
        return jsonify(
            [
                {
                    "id": stop.get("stop_id"),
                    "code": stop.get("stop_code"),
                    "name": stop.get("stop_name"),
                    "lat": stop.get("stop_lat"),
                    "lon": stop.get("stop_lon"),
                }
                for stop in self.gtfs.stops.values()
            ]
        )

    def route_api_map_stop(self, stop_id: str) -> Response:
        return jsonify(
            [
                {
                    "idx": idx,
                    "id": stop.get("stop_id"),
                    "code": stop.get("stop_code"),
                    "name": stop.get("stop_name"),
                    "lat": stop.get("stop_lat"),
                    "lon": stop.get("stop_lon"),
                }
                for idx, stop in enumerate(self.gtfs.all_stops_in_group(stop_id))
            ]
        )

    def route_api_map_trip(self, trip_id: str) -> Response:
        stop_to_sequences: dict[str, list[str]] = {}
        for time in self.gtfs.stop_times.get(trip_id, []):
            stop_to_sequences.setdefault(time["stop_id"], []).append(time["stop_sequence"])

        stops: list[dict[str, Any]] = []
        for stop_id, sequences in stop_to_sequences.items():
            stop = self.gtfs.stops.get(stop_id, {})
            stops.append(
                {
                    "id": stop_id,
                    "lat": stop.get("stop_lat"),
                    "lon": stop.get("stop_lon"),
                    "name": stop.get("stop_name"),
                    "seq": sequences,
                }
            )

        return jsonify(stops)

    def route_api_map_shape(self, shape_id: str) -> Response:
        return jsonify(self.gtfs.shapes.get(shape_id, []))

    # JSON calendar data

    def route_api_calendar_dates(self, service_id: str) -> Response:
        return jsonify([i.isoformat() for i in self.gtfs.all_dates_of(service_id)])

    # Main entry point

    def run(self, debug: bool = False) -> None:
        return self.flask.run(load_dotenv=False, debug=debug, use_evalex=False)


def make_app() -> Flask:
    # Parse the arguments
    arg_parser = argparse.ArgumentParser()
    arg_parser.add_argument("file", type=Path, help="path to GTFS directory/zip")
    args = arg_parser.parse_args()

    # Load GTFS data
    gtfs = Gtfs.from_user_input(args.file)

    # Create the application
    app = Application(gtfs)

    # Return the created Flask instance
    return app.flask


def main() -> int:
    # Parse the arguments
    arg_parser = argparse.ArgumentParser()
    arg_parser.add_argument("file", type=Path, help="path to GTFS directory/zip")
    arg_parser.add_argument(
        "-d",
        "--debug",
        action="store_true",
        help="enable debug mode in Flask",
    )
    args = arg_parser.parse_args()

    # Load GTFS data
    gtfs = Gtfs.from_user_input(args.file)

    # Create the application
    app = Application(gtfs)

    # Run it
    app.run(args.debug)
    return 0
