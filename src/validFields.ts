/*
jvig - GTFS Viewer application written using Typescript & Electron
Copyright © 2020 Mikołaj Kuranowski

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// agency.txt
export const validAgencyFields = new Set([
    "agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang", "agency_phone",
    "agency_fare_url", "agency_email"
])

// calendar.txt & calendar_dates.txt
export const validCalendarFields = new Set([
    "service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
    "sunday", "start_date", "end_date"
])

export const validDatesFields = new Set(["service_id", "date", "exception_type"])

export const extendedCalendarFields = new Set(["service_desc"])

// stops.txt
export const validStopsFields = new Set([
    "stop_id", "stop_code", "stop_name", "stop_desc", "stop_lat", "stop_lon", "zone_id",
    "stop_url", "location_type", "parent_station", "stop_timezone", "wheelchair_boarding",
    "platform_code"
])

// routes.txt
export const validRoutesFields = new Set([
    "route_id", "agency_id", "route_short_name", "route_long_name", "route_type", "route_desc",
    "route_url", "route_color", "route_text_color", "route_sort_order"
])

// trips.txt
export const validTripsFields = new Set([
    "route_id", "service_id", "trip_id", "trip_headsign", "trip_short_name",
    "direction_id", "block_id", "shape_id", "wheelchair_accessible", "bikes_allowed"
])

export const extendedTripsFields = new Set(["exceptional"])

// stop_times.txt
export const validTimesFields = new Set([
    "trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence",
    "stop_headsign", "pickup_type", "drop_off_type", "shape_dist_traveled", "timepoint"
])

// frequencies.txt
export const validFreqFields = new Set([
    "trip_id", "start_time", "end_time", "headway_secs", "exact_times"
])
