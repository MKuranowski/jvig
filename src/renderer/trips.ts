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

import { ipcRenderer } from "electron"
import type { IpcRendererEvent } from "electron"

import { NoContentInHtml } from "../errs"
import { validTripsFields, extendedTripsFields } from "../validFields"
import type * as Gtfs from "../gtfsTypes"

// A handler for createing cell elements of the CSV header
export function prepareHeaderCell (key: string): HTMLElement {
    const el = document.createElement("th")
    el.append(key)

    // Set background color for extended or invalid fields
    if (extendedTripsFields.has(key)) {
        el.className = "value-extended"
    } else if (key !== "" && !validTripsFields.has(key)) {
        el.className = "value-unrecognized"
    }

    return el
}

// A handler for creating cell with value
export function prepareValueCell (key: string, value: string, row: any): HTMLElement {
    const cellElem = document.createElement("td")
    let elem: string | HTMLAnchorElement

    switch (key) {
    case "_link_times":
        elem = document.createElement("a")
        elem.href = `trip.html?id=${encodeURIComponent(value)}`
        elem.append("Trip times →")
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

export async function init (): Promise<void> {
    const content = document.getElementById("content")
    let wroteHeader: boolean = false

    // Check if content exists
    if (content === null) {
        throw new NoContentInHtml("this document has no element with id=content")
    }

    // Check if we should filter by a specific route_id/block_id
    const expectedRoute = (new URLSearchParams(window.location.search)).get("route")
    const expectedBlock = (new URLSearchParams(window.location.search)).get("block")

    if (expectedRoute === null && expectedBlock === null) {
        const h3 = document.createElement("h3")
        h3.className = "value-error"

        content.append(h3)
        h3.append("Error! Missing route/block parameters.")
        return
    }

    // Get the csv.Parser
    const exists = await ipcRenderer.invoke("exists", "trips") as boolean

    if (!exists) {
        const h3 = document.createElement("h3")
        h3.className = "value-error"

        content.append(h3)
        h3.append("Error! File trips.txt is not present in the GTFS")
        return
    }

    // Create HTML elements
    const table = document.createElement("table")
    content.append(table)

    // Add a handler when data arrives
    ipcRenderer.on("dump-stream", async (event: IpcRendererEvent, row: Gtfs.Row) => {
        if (!wroteHeader) {
            // Write header, if it wasn't written
            const headerTr = document.createElement("tr")
            table.append(headerTr)

            wroteHeader = true
            const headerElems = ["", ...Object.keys(row)]
                .map(key => prepareHeaderCell(key))
            headerTr.append(...headerElems)
        }

        // Check against route_id / block_id filters
        if (expectedRoute !== null && expectedRoute !== row.route_id) {
            return
        } else if (expectedBlock !== null && expectedBlock !== row.block_id) {
            return
        }

        // Write the normal row
        const tr = document.createElement("tr")
        table.append(tr)

        const elems = [["_link_times", row.trip_id], ...Object.entries(row)]
            .map(([key, value]) => prepareValueCell(key, value, row))

        // Add all cells to row
        tr.append(...elems)
    })

    // Request the data dump
    await ipcRenderer.invoke("dump-request", "trips")
}
