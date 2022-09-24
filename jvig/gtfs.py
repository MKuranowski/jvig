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

import csv
import logging
import zipfile
from dataclasses import dataclass, field
from datetime import date, timedelta
from io import TextIOWrapper
from math import nan
from pathlib import Path
from typing import IO, Callable, List, Union

from .util import parse_gtfs_date

logger = logging.getLogger("jvig.gtfs")

Row = dict[str, str]
Point = tuple[float, float]

TableToOne = dict[str, Row]
TableToMany = dict[str, list[Row]]
TableToPoints = dict[str, list[Point]]
Table = Union[TableToOne, TableToMany, TableToPoints]


def _get_shape_pt(row: Row) -> Point:
    """Tries to parse a shapes.txt row into a Point tuple.
    If there's anything wrong with the row, returns (nan, nan)."""
    try:
        return float(row.get("shape_pt_lat", nan)), float(row.get("shape_pt_lon", nan))
    except ValueError:
        return nan, nan


_table_keys: dict[str, str] = {
    "agency": "agency_id",
    "stops": "stop_id",
    "routes": "route_id",
    "trips": "trip_id",
    "calendar": "service_id",
    "calendar_dates": "service_id",
    "frequencies": "trip_id",
    "stop_times": "trip_id",
    "shapes": "shape_id",
}


@dataclass
class Gtfs:
    """Gtfs is a class that holds all known GTFS tables.
    It's also responsible for loading the data."""

    agency: TableToOne = field(default_factory=dict)
    stops: TableToOne = field(default_factory=dict)
    stop_children: dict[str, list[str]] = field(default_factory=dict)
    routes: TableToOne = field(default_factory=dict)
    trips: TableToOne = field(default_factory=dict)
    calendar: TableToOne = field(default_factory=dict)
    calendar_dates: TableToMany = field(default_factory=dict)
    frequencies: TableToMany = field(default_factory=dict)
    stop_times: TableToMany = field(default_factory=dict)
    stop_times_by_stops: TableToMany = field(default_factory=dict)
    shapes: TableToPoints = field(default_factory=dict)

    def load_to_row(self, table_name: str, stream: IO[str]) -> None:
        """Loads a table where the key should map into a single row,
        like agency.txt or calendar.txt."""
        primary_key = _table_keys[table_name]
        table: TableToOne = getattr(self, table_name)
        table.clear()

        for row in csv.DictReader(stream):
            # Fix for GTFS feeds without an explicit agency_id
            if table_name in ("agency", "routes") and "agency_id" not in row:
                row["agency_id"] = "(missing)"

            table[row[primary_key]] = row

    def load_to_rows(self, table_name: str, stream: IO[str]) -> None:
        """Loads a table where the key should map into multiple row, like frequencies.txt."""
        primary_key = _table_keys[table_name]
        table: TableToMany = getattr(self, table_name)
        table.clear()

        for row in csv.DictReader(stream):
            table.setdefault(row[primary_key], []).append(row)

    def load_stops(self, table_name: str, stream: IO[str]) -> None:
        """Specialized loader for stops.txt, which loads data into both
        self.stops and self.stop_children."""
        assert table_name == "stops"
        self.stops.clear()
        self.stop_children.clear()

        for row in csv.DictReader(stream):
            self.stops[row["stop_id"]] = row

            # Check if this is a child stop belonging to a larger structure
            parent = row.get("parent_station")
            if parent and row.get("location_type") != "1":
                self.stop_children.setdefault(parent, []).append(row["stop_id"])

    def load_shapes(self, table_name: str, stream: IO[str]) -> None:
        """Specialized loader for shapes.txt to parse the shape."""
        assert table_name == "shapes"
        self.shapes.clear()

        # FIXME: First sort by shape_pt_sequence
        for row in csv.DictReader(stream):
            self.shapes.setdefault(row["shape_id"], []).append(_get_shape_pt(row))

    def load_stop_times(self, table_name: str, stream: IO[str]) -> None:
        """Specialized loader for stop_times.txt, which loads the data
        into self.stop_times and self.stop_times_by_stops."""
        # FIXME: Sort by stop_sequence

        assert table_name == "stop_times"
        self.stop_times.clear()
        self.stop_times_by_stops.clear()

        for row in csv.DictReader(stream):
            self.stop_times.setdefault(row["trip_id"], []).append(row)
            self.stop_times_by_stops.setdefault(row["stop_id"], []).append(row)

    def header_of(self, table_name: str) -> List[str]:
        """Returns the GTFS header of a particlar table."""
        table: Union[TableToOne, TableToMany] = getattr(self, table_name)

        # Get the first entry from the table
        entry = next(iter(table.values()), {})

        # If it's a list of rows, get its first row
        if isinstance(entry, list):
            entry = entry[0]

        # Return the keys of the row
        return list(entry.keys())

    @property
    def _loader_table(self) -> dict[str, Callable[[str, IO[str]], None]]:
        return {
            "agency": self.load_to_row,
            "stops": self.load_stops,
            "routes": self.load_to_row,
            "trips": self.load_to_row,
            "calendar": self.load_to_row,
            "calendar_dates": self.load_to_rows,
            "frequencies": self.load_to_rows,
            "stop_times": self.load_stop_times,
            "shapes": self.load_shapes,
        }

    @classmethod
    def from_directory(cls, where: Path) -> "Gtfs":
        """Loads GTFS data from a directory of .txt files"""
        self = cls()
        loaders = self._loader_table

        for f in where.glob("*.txt"):
            table_name = f.stem
            loader = loaders.get(table_name)

            if loader:
                logger.info(f"Loading table {table_name}")
                with f.open(mode="r", encoding="utf-8-sig", newline="") as stream:
                    loader(table_name, stream)

        return self

    @classmethod
    def from_zip(cls, where: Path) -> "Gtfs":
        """Loads GTFS data from a .zip archive"""
        self = cls()
        loaders = self._loader_table

        with zipfile.ZipFile(where, mode="r") as archive:
            for f in archive.infolist():
                if not f.filename.endswith(".txt"):
                    logger.warn(f"Unrecognized file in zip: {f.filename}")
                    continue

                table_name = f.filename[:-4]
                loader = loaders.get(table_name)

                if loader:
                    logger.info(f"Loading table {table_name}")
                    with archive.open(f, mode="r") as binary_stream:
                        stream = TextIOWrapper(binary_stream, encoding="utf-8-sig", newline="")
                        loader(table_name, stream)

                else:
                    logger.warning(f"Unrecognized file in zip: {f.filename}")

        return self

    @classmethod
    def from_user_input(cls, where: Path) -> "Gtfs":
        """Loads data from a .zip file (if `where` is a file),
        or from a directory with .txt files (if `where` is not a file)"""
        return cls.from_zip(where) if where.is_file() else cls.from_directory(where)

    def all_stops_in_group(self, stop_id: str) -> list[Row]:
        """Returns all stops in the group to which `stop_id` belongs.

        If the stop doesn't exist, returns an empty list.
        If the stop doesn't belong to a group, returns a list with one element.

        In any other cases, the provided stop will always be the
        first element in the returned list.
        """
        if stop_id not in self.stops:
            return []

        stop = self.stops[stop_id]
        stops = [stop]

        if stop.get("location_type") == "1":
            # This stop is the parent station - just append the children
            stops.extend(
                self.stops[child_id]
                for child_id in self.stop_children.get(stop_id, [])
                if child_id in self.stops
            )

        elif stop.get("parent_station") in self.stop_children:
            # This stop is a child in a station - first append the parent,
            # then the other children
            parent_id = stop["parent_station"]

            if parent_id in self.stops:
                stops.append(self.stops[parent_id])

            stops.extend(
                self.stops[child_id]
                for child_id in self.stop_children.get(parent_id, [])
                if child_id in self.stops and child_id != stop_id
            )

        return stops

    def all_dates_of(self, service_id: str) -> set[date]:
        """Returns a set of all date on which a particular calendar is active"""
        dates: set[date] = set()

        # Read the calendar.txt row
        calendar_row = self.calendar.get(service_id)
        if calendar_row:
            active_weekdays = {
                0: calendar_row["monday"] == "1",
                1: calendar_row["tuesday"] == "1",
                2: calendar_row["wednesday"] == "1",
                3: calendar_row["thursday"] == "1",
                4: calendar_row["friday"] == "1",
                5: calendar_row["saturday"] == "1",
                6: calendar_row["sunday"] == "1",
            }
            day = parse_gtfs_date(calendar_row["start_date"])
            end = parse_gtfs_date(calendar_row["end_date"])
            while day <= end:
                if active_weekdays[day.weekday()]:
                    dates.add(day)
                day += timedelta(days=1)

        # Add the calendar_dates.txt rows
        for dates_row in self.calendar_dates.get(service_id, []):
            day = parse_gtfs_date(dates_row["date"])
            if dates_row["exception_type"] == "1":
                dates.add(day)
            elif dates_row["exception_type"] == "2":
                dates.discard(day)

        return dates
