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
import { NoContentInHtml } from "../errs"
import { validAgencyFields } from "../validFields"

import type { IpcRendererEvent } from "electron"
import type * as Gtfs from "../gtfsTypes"

// A handler for createing cell elements of the CSV header
function prepareHeaderCell (key: string): HTMLElement {
    const el = document.createElement("th")
    el.append(key)

    // Set a khaki background for unrecognized field names
    if (key !== "" && !validAgencyFields.has(key)) { el.className = "value-unrecognized" }

    return el
}

// A handler for creating
function prepareValueCell (key: string, value: string): HTMLElement {
    const cellElem = document.createElement("td")
    let elem: string | HTMLAnchorElement

    switch (key) {
    case "_link_routes":
        elem = document.createElement("a")
        elem.href = `routes.html?agency=${encodeURIComponent(value)}`
        elem.append("Agency routes →")
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

    // Check if agency table exists
    const exists = await ipcRenderer.invoke("exists", "agency") as boolean

    if (!exists) {
        const h3 = document.createElement("h3")
        h3.className = "value-error"

        content.append(h3)
        h3.append("Error! File agency.txt is not present in the GTFS")
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

        // Write the normal row
        const tr = document.createElement("tr")
        table.append(tr)

        const elems = [["_link_routes", row.agency_id], ...Object.entries(row)]
            .map(([key, value]) => prepareValueCell(key, value))

        // Add all cells to row
        tr.append(...elems)
    })

    // Request the data dump
    await ipcRenderer.invoke("dump-request", "agency")
}
