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

import { validDate } from "../util"

// Valid fields
const validCalendarFields = new Set([
    "service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
    "sunday", "start_date", "end_date"
])

const validDatesFields = new Set(["service_id", "date", "exception_type"])

const extendedCalendarFields = new Set(["service_desc"])

// Functions - Headers
export function prepareCalendarHeader (key: string): HTMLTableHeaderCellElement {
    const el = document.createElement("th")
    el.append(key)

    // Set background color
    if (extendedCalendarFields.has(key)) {
        el.className = "value-extended"
    } else if (key !== "" && !validCalendarFields.has(key)) {
        el.className = "value-unrecognized"
    }

    return el
}

export function prepareDatesHeader (key: string): HTMLTableHeaderCellElement {
    const el = document.createElement("th")
    el.append(key)

    // Set background color
    if (extendedCalendarFields.has(key)) {
        el.className = "value-extended"
    } else if (key !== "" && !validDatesFields.has(key)) {
        el.className = "value-unrecognized"
    }

    return el
}

// Functions - Values
export function prepareCalendarValue (key: string, value: string): HTMLTableDataCellElement {
    const cellElem = document.createElement("td")
    let elem: string

    switch (key) {
    case "start_date":
    case "end_date":
        if (!validDate(value)) { cellElem.className = "value-invalid" }
        elem = value

        break
    case "monday":
    case "tuesday":
    case "wednesday":
    case "thursday":
    case "friday":
    case "saturday":
    case "sunday":
        if (value !== "0" && value !== "1") { cellElem.className = "value-invalid" }
        elem = value

        break
    default:
        elem = value
    }

    cellElem.append(elem)
    return cellElem
}

export function prepareDatesValue (key: string, value: string): HTMLTableDataCellElement {
    const cellElem = document.createElement("td")
    let elem: string

    switch (key) {
    case "date":
        if (!validDate(value)) { cellElem.className = "value-invalid" }
        elem = value

        break
    case "exception_type":
        if (value === "1") {
            elem = "1 (➕)"
        } else if (value === "2") {
            elem = "2 (➖)"
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
