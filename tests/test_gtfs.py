# jvig - GTFS Viewer, created using Flask.
# Copyright © 2022-2023 Mikołaj Kuranowski

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

from datetime import date
from io import StringIO
from pathlib import Path
from typing import ClassVar, Optional

from jvig.gtfs import Gtfs

FIXTURE_PATH = Path(__file__).with_name("fixtures")

# TODO: Test stop-station structures
# TODO: Test missing agency_id
# TODO: Test Gtfs.all_stops_in_group


class BaseWkdGtfsTest:
    def get_gtfs(self) -> Gtfs:
        raise NotImplementedError("Subclasses of BaseGtfsTest must implement get_gtfs()")

    def test_single_row(self) -> None:
        g = self.get_gtfs()
        assert len(g.agency) == 1
        assert "0" in g.agency

        a = g.agency["0"]
        assert a["agency_id"] == "0"
        assert a["agency_name"] == "Warszawska Kolej Dojazdowa"
        assert a["agency_url"] == "http://www.wkd.com.pl/"
        assert a["agency_lang"] == "pl"
        assert a["agency_timezone"] == "Europe/Warsaw"

    def test_many_rows(self) -> None:
        g = self.get_gtfs()
        assert len(g.calendar_dates) == 2
        assert "C" in g.calendar_dates
        assert "D" in g.calendar_dates

        ds = g.calendar_dates["C"]
        assert len(ds) == 9

        d = ds[2]
        assert d["service_id"] == "C"
        assert d["date"] == "20220417"
        assert d["exception_type"] == "1"

    def test_stop_times(self) -> None:
        g = self.get_gtfs()
        assert len(g.stop_times) == 304
        assert "100" in g.stop_times

        t = g.stop_times["100"]
        assert len(t) == 19

        st = t[10]
        assert st["trip_id"] == "100"
        assert st["stop_sequence"] == "10"
        assert st["stop_id"] == "micha"
        assert st["arrival_time"] == "19:47:00"
        assert st["departure_time"] == "19:47:00"

    def test_stop_times_by_stop(self) -> None:
        g = self.get_gtfs()
        assert len(g.stop_times_by_stops) == 28
        assert "wsrod" in g.stop_times_by_stops

        s = g.stop_times_by_stops["wsrod"]
        assert len(s) == 296

        st = s[5]
        assert st["trip_id"] == "6"
        assert st["stop_sequence"] == "0"
        assert st["stop_id"] == "wsrod"
        assert st["arrival_time"] == "06:40:00"
        assert st["departure_time"] == "06:40:00"

    def test_stops(self) -> None:
        g = self.get_gtfs()
        assert len(g.stops) == 28
        assert "prusz" in g.stops

        s = g.stops["prusz"]
        assert s["stop_id"] == "prusz"
        assert s["stop_name"] == "Pruszków WKD"
        assert s["stop_lat"] == "52.1616392"
        assert s["stop_lon"] == "20.8166108"
        assert s["wheelchair_boarding"] == "1"

    def test_shapes(self) -> None:
        g = self.get_gtfs()
        assert len(g.shapes) == 10
        assert "5" in g.shapes

        s = g.shapes["5"]
        assert len(s) == 62

        assert s[10] == (52.1046287632, 20.64141690463)

    def test_header_of(self) -> None:
        g = self.get_gtfs()
        assert g.header_of("routes") == [
            "agency_id",
            "route_id",
            "route_short_name",
            "route_long_name",
            "route_type",
            "route_color",
            "route_text_color",
        ]
        assert g.header_of("stop_times") == [
            "trip_id",
            "stop_sequence",
            "stop_id",
            "arrival_time",
            "departure_time",
        ]

    def test_all_dates_of(self) -> None:
        dates = self.get_gtfs().all_dates_of("C")
        assert date(2021, 12, 12) in dates
        assert date(2021, 12, 13) not in dates
        assert date(2021, 12, 24) in dates
        assert date(2022, 12, 30) not in dates
        assert date(2022, 12, 31) in dates


class TestWkdGtfsZip(BaseWkdGtfsTest):
    gtfs_instance: ClassVar[Optional[Gtfs]] = None

    def get_gtfs(self) -> Gtfs:
        if not TestWkdGtfsZip.gtfs_instance:
            TestWkdGtfsZip.gtfs_instance = Gtfs.from_zip(FIXTURE_PATH / "gtfs_wkd.zip")
        return TestWkdGtfsZip.gtfs_instance


class TestWkdGtfsDirectory(BaseWkdGtfsTest):
    gtfs_instance: ClassVar[Optional[Gtfs]] = None

    def get_gtfs(self) -> Gtfs:
        if not TestWkdGtfsDirectory.gtfs_instance:
            TestWkdGtfsDirectory.gtfs_instance = Gtfs.from_directory(FIXTURE_PATH / "gtfs_wkd")
        return TestWkdGtfsDirectory.gtfs_instance


def test_unordered_stop_times() -> None:
    stop_times_file = StringIO(
        (
            "trip_id,stop_sequence,stop_id,arrival_time,departure_time\r\n"
            "t1,1,s0,10:00:00,10:00:00\r\n"
            "t1,2,s1,10:05:00,10:05:00\r\n"
            "t1,3,s2,10:10:00,10:10:00\r\n"
            "t2,3,s0,10:25:00,10:25:00\r\n"
            "t2,2,s1,10:20:00,10:20:00\r\n"
            "t2,1,s2,10:15:00,10:15:00\r\n"
        )
    )

    gtfs = Gtfs()
    gtfs.load_stop_times("stop_times", stop_times_file)

    assert len(gtfs.stop_times) == 2

    assert len(gtfs.stop_times["t1"]) == 3
    assert gtfs.stop_times["t1"][0]["stop_sequence"] == "1"
    assert gtfs.stop_times["t1"][0]["stop_id"] == "s0"
    assert gtfs.stop_times["t1"][1]["stop_sequence"] == "2"
    assert gtfs.stop_times["t1"][1]["stop_id"] == "s1"
    assert gtfs.stop_times["t1"][2]["stop_sequence"] == "3"
    assert gtfs.stop_times["t1"][2]["stop_id"] == "s2"

    assert len(gtfs.stop_times["t2"]) == 3
    assert gtfs.stop_times["t2"][0]["stop_sequence"] == "1"
    assert gtfs.stop_times["t2"][0]["stop_id"] == "s2"
    assert gtfs.stop_times["t2"][1]["stop_sequence"] == "2"
    assert gtfs.stop_times["t2"][1]["stop_id"] == "s1"
    assert gtfs.stop_times["t2"][2]["stop_sequence"] == "3"
    assert gtfs.stop_times["t2"][2]["stop_id"] == "s0"


def test_unordered_shapes() -> None:
    shapes_file = StringIO(
        (
            "shape_id,shape_pt_sequence,shape_pt_lat,shape_pt_lon\r\n"
            "A,2,2.0,2.0\r\n"
            "A,0,0.0,0.0\r\n"
            "A,1,1.0,1.0\r\n"
            "B,3,-3.0,-3.0\r\n"
            "B,1,-1.0,-1.0\r\n"
            "B,2,-2.0,-2.0\r\n"
            "B,0,0.0,0.0\r\n"
        )
    )

    gtfs = Gtfs()
    gtfs.load_shapes("shapes", shapes_file)

    assert len(gtfs.shapes) == 2

    assert len(gtfs.shapes["A"]) == 3
    assert gtfs.shapes["A"][0] == (0.0, 0.0)
    assert gtfs.shapes["A"][1] == (1.0, 1.0)
    assert gtfs.shapes["A"][2] == (2.0, 2.0)

    assert len(gtfs.shapes["B"]) == 4
    assert gtfs.shapes["B"][0] == (0.0, 0.0)
    assert gtfs.shapes["B"][1] == (-1.0, -1.0)
    assert gtfs.shapes["B"][2] == (-2.0, -2.0)
    assert gtfs.shapes["B"][3] == (-3.0, -3.0)
