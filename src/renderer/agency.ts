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
import { prepareAgencyHeader, prepareAgencyValue } from "../tables/agency"
import type * as Gtfs from "../gtfsTypes"

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
    ipcRenderer.on("dump-stream-agency", async (event: IpcRendererEvent, row: Gtfs.Row) => {
        if (!wroteHeader) {
            // Write header, if it wasn't written
            const headerTr = document.createElement("tr")
            table.append(headerTr)

            wroteHeader = true
            const headerElems = ["", ...Object.keys(row)]
                .map(key => prepareAgencyHeader(key))
            headerTr.append(...headerElems)
        }

        // Write the normal row
        const tr = document.createElement("tr")
        table.append(tr)

        const elems = [["_link_routes", row.agency_id], ...Object.entries(row)]
            .map(([key, value]) => prepareAgencyValue(key, value))

        // Add all cells to row
        tr.append(...elems)
    })

    // Request the data dump
    await ipcRenderer.invoke("dump-request", "agency")

    // Wait a bit after dump-request finishes (had some issues without a timeout)
    // And remove listener from dump-stream channel
    await new Promise(resolve => setTimeout(resolve, 50))
    ipcRenderer.removeAllListeners("dump-stream-agency")
}
