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

import { validTime } from "../util"

// Valid fields
const validTripsFields = new Set([
    "route_id", "service_id", "trip_id", "trip_headsign", "trip_short_name",
    "direction_id", "block_id", "shape_id", "wheelchair_accessible", "bikes_allowed"
])

const extendedTripsFields = new Set(["exceptional"])

// Functions
export function prepareTripsHeader (key: string): HTMLTableHeaderCellElement {
    const el = document.createElement("th")

    switch (key) {
    case "_start_time":
        el.className = "value-inherited"
        el.append("first time")
        break
    case "_end_time":
        el.className = "value-inherited"
        el.append("last time")
        break
    default:
        el.append(key)
        if (extendedTripsFields.has(key)) {
            el.className = "value-extended"
        } else if (key !== "" && !validTripsFields.has(key)) {
            el.className = "value-unrecognized"
        }
    }

    return el
}

export function prepareTripsValue (key: string, value: string): HTMLTableDataCellElement {
    const cellElem = document.createElement("td")
    let elem: string | HTMLAnchorElement

    switch (key) {
    case "_link_times":
        elem = document.createElement("a")
        elem.href = `trip.html?id=${encodeURIComponent(value)}`
        elem.append("Trip times →")
        break
    case "_start_time":
    case "_end_time":
        if (value !== "" && !validTime(value)) { cellElem.className = "value-invalid" }
        elem = value
        break
    case "route_id":
        elem = document.createElement("a")
        elem.href = `trips.html?route=${encodeURIComponent(value)}`
        elem.append(value)
        break
    case "direction_id":
    case "exceptional":
        if (value !== "0" && value !== "1") {
            cellElem.className = "value-invalid"
        }
        elem = value
        break
    case "block_id":
        elem = document.createElement("a")
        elem.href = `trips.html?block=${encodeURIComponent(value)}`
        elem.append(value)
        break
    case "wheelchair_accessible":
        if (value === "" || value === "0") {
            elem = `${value} (♿❓)`
        } else if (value === "1") {
            elem = `${value} (♿✔️)`
        } else if (value === "2") {
            elem = `${value} (♿❌)`
        } else {
            cellElem.className = "value-invalid"
            elem = value
        }
        break
    case "bikes_allowed":
        if (value === "" || value === "0") {
            elem = `${value} (🚲❓)`
        } else if (value === "1") {
            elem = `${value} (🚲✔️)`
        } else if (value === "2") {
            elem = `${value} (🚲❌)`
        } else {
            cellElem.className = "value-invalid"
            elem = value
        }
        break
    default:
        elem = value
    }

    cellElem.append(elem)
    return cellElem
}
