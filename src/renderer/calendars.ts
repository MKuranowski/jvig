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
import {
    prepareCalendarHeader,
    prepareDatesHeader,
    prepareCalendarValue,
    prepareDatesValue
} from "../tables/calendars"
import type * as Gtfs from "../gtfsTypes"

// Add rows from calendar.txt to window
async function dumpCalendar (table: HTMLTableElement) {
    let wroteHeader: boolean = false

    // Iterate over rows of calendar.txt
    ipcRenderer.on("dump-stream-calendar", async (event: IpcRendererEvent, row: Gtfs.Row) => {
        // Write header, if it wasn't written
        if (!wroteHeader) {
            const headerTr = document.createElement("tr")
            table.append(headerTr)

            wroteHeader = true
            const headerElems = Object.keys(row)
                .map(key => prepareCalendarHeader(key))
            headerTr.append(...headerElems)
        }

        // Create table row
        const tr = document.createElement("tr")
        table.append(tr)

        const elems = Object.entries(row)
            .map(([key, value]) => prepareCalendarValue(key, <string>value))

        // Add all cells to row
        tr.append(...elems)
    })

    // Request the data dump
    await ipcRenderer.invoke("dump-request", "calendar")

    // Wait a bit after dump-request finishes (had some issues without a timeout)
    // And remove listener from dump-stream channel
    await new Promise(resolve => setTimeout(resolve, 50))
    ipcRenderer.removeAllListeners("dump-stream-calendar")
}

// Add rows from calendar_dates.txt to window
async function dumpDates (table: HTMLTableElement) {
    let wroteHeader: boolean = false

    // Iterate over rows of calendar_dates.txt
    ipcRenderer.on("dump-stream-calendarDates", async (event: IpcRendererEvent, rows: Gtfs.Row[]) => {
        const serviceId = rows[0].service_id

        // Write header, if it wasn't written
        if (!wroteHeader) {
            const headerTr = document.createElement("tr")
            table.append(headerTr)

            wroteHeader = true
            const headerElems = Object.keys(rows[0])
                .map(key => prepareDatesHeader(key))
            headerTr.append(...headerElems)
        }

        // Add row with service_id: something
        const colspan = Object.keys(rows[0]).length
        const serviceRow = document.createElement("tr")
        const serviceCell = document.createElement("td")

        serviceCell.colSpan = colspan
        serviceCell.className = "align-center"
        serviceCell.append(`service_id: ${serviceId}`)
        serviceRow.append(serviceCell)
        table.append(serviceRow)

        // Iterate over rows with that serviceId
        for (const row of rows) {
            // Create table row
            const tr = document.createElement("tr")
            table.append(tr)

            const elems = Object.entries(row)
                .map(([key, value]) => prepareDatesValue(key, <string>value))

            // Add all cells to row
            tr.append(...elems)
        }
    })

    // Request the data dump
    await ipcRenderer.invoke("dump-request", "calendarDates")

    // Wait a bit after dump-request finishes (had some issues without a timeout)
    // And remove listener from dump-stream channel
    await new Promise(resolve => setTimeout(resolve, 50))
    ipcRenderer.removeAllListeners("dump-stream-calendarDates")
}

export async function init (): Promise<void> {
    const content = document.getElementById("content")

    // Check if content exists
    if (content === null) {
        throw new NoContentInHtml("this document has no element with id=content")
    }

    // Check if calendar.txt and/or calendar_dates.txt exist
    const [calendarExists, datesExist]: [boolean, boolean] = await Promise.all([
        ipcRenderer.invoke("exists", "calendar"), ipcRenderer.invoke("exists", "calendarDates")
    ])

    if (calendarExists && datesExist) {
        // Create calendar.txt header
        const calendarHeader = document.createElement("h5")
        calendarHeader.append("calendar.txt")
        content.append(calendarHeader)

        // Create calendar.txt table
        const calendarTable = document.createElement("table")
        content.append(calendarTable)

        // Add a separator
        content.append(document.createElement("hr"))

        // Create calendar_dates.txt header
        const datesHeader = document.createElement("h5")
        datesHeader.append("calendar_dates.txt")
        content.append(datesHeader)

        // Create calendar_dates.txt table
        const datesTable = document.createElement("table")
        content.append(datesTable)

        // Dump both calendars and calendar_dates
        await Promise.all([dumpCalendar(calendarTable), dumpDates(datesTable)])
    } else if (calendarExists) {
        // Create header
        const header = document.createElement("h5")
        header.append("calendar.txt")
        content.append(header)

        // Create table
        const table = document.createElement("table")
        content.append(table)

        await dumpCalendar(table)
    } else if (datesExist) {
        // Create header
        const header = document.createElement("h5")
        header.append("calendar_dates.txt")
        content.append(header)

        // Create table
        const table = document.createElement("table")
        content.append(table)

        await dumpDates(table)
    } else {
        const h3 = document.createElement("h3")
        h3.className = "value-error"

        content.append(h3)
        h3.append("Error! File calendar.txt & calendar_dates.txt are not present in the GTFS")
    }
}
