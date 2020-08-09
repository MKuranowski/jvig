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

import { validLat, validLon } from "../util"

// Valid fields
const validStopsFields = new Set([
    "stop_id", "stop_code", "stop_name", "stop_desc", "stop_lat", "stop_lon", "zone_id",
    "stop_url", "location_type", "parent_station", "stop_timezone", "wheelchair_boarding",
    "platform_code"
])

// Functions
export function prepareStopsHeader (key: string): HTMLTableHeaderCellElement {
    const el = document.createElement("th")
    el.append(key)

    // Set a khaki background for unrecognized field names
    if (key !== "" && !validStopsFields.has(key)) { el.className = "value-unrecognized" }

    return el
}

export function prepareStopsValue (key: string, value: string): HTMLTableDataCellElement {
    const cellElem = document.createElement("td")
    let elem: string | HTMLAnchorElement

    switch (key) {
    case "_link_departures":
        elem = document.createElement("a")
        elem.href = `stop.html?id=${encodeURIComponent(value)}`
        elem.append("Stop departures →")
        break
    case "stop_lat":
        if (validLat(value) === null) { cellElem.className = "value-invalid" }
        elem = value
        break
    case "stop_lon":
        if (validLon(value) === null) { cellElem.className = "value-invalid" }
        elem = value
        break
    case "location_type":
        if (value === "") {
            elem = value
        } else if (value === "0") {
            elem = `${value} (🚏)`
        } else if (value === "1") {
            elem = `${value} (🏢)`
        } else if (value === "2") {
            elem = `${value} (➡️🚪)`
        } else {
            cellElem.className = "value-invalid"
            elem = value
        }
        break
    case "wheelchair_boarding":
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
    default:
        elem = value
    }

    cellElem.append(elem)
    return cellElem
}
