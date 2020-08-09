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
const validFreqFields = new Set([
    "trip_id", "start_time", "end_time", "headway_secs", "exact_times"
])

// Functions
export function prepareFreqHeader (key: string): HTMLTableHeaderCellElement {
    const el = document.createElement("th")

    // Set background color for invalid fields
    if (key !== "" && !validFreqFields.has(key)) {
        el.className = "value-unrecognized"
    }

    el.append(key)
    return el
}

export function prepareFreqValue (key: string, value: string): HTMLTableDataCellElement {
    const cellElem = document.createElement("td")
    let elem: string | HTMLAnchorElement

    switch (key) {
    case "trip_id":
        elem = document.createElement("a")
        elem.href = `trip.html?id=${encodeURIComponent(value)}`
        elem.append(value)
        break
    case "start_time":
    case "end_time":
        if (!validTime(value)) { cellElem.className = "value-invalid" }
        elem = value
        break
    case "headway_secs":
        if (value.match(/^\d+$/) === null) { cellElem.className = "value-invalid" }
        elem = value
        break
    case "exact_times":
        if (value === "" || value === "0") {
            elem = `${value} (⌚🤷)`
        } else if (value === "1") {
            elem = "1 (⌚📌)"
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
