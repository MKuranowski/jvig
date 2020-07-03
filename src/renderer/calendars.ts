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

import { validDate } from "../util"
import { NoContentInHtml } from "../errs"

import { validCalendarFields, validDatesFields, extendedCalendarFields } from "../validFields"

import type * as Gtfs from "../gtfsTypes"

// A handler for creating cell elements of the CSV header
function prepareHeaderCell (key: string, table: "calendar" | "calendar_dates"): HTMLElement {
    const el = document.createElement("th")
    el.append(key)

    // Set background color
    if (extendedCalendarFields.has(key)) {
        el.className = "value-extended"
    } else if (table === "calendar" && !validCalendarFields.has(key)) {
        el.className = "value-unrecognized"
    } else if (table === "calendar_dates" && !validDatesFields.has(key)) {
        el.className = "value-unrecognized"
    }

    return el
}

// A handler for creating cell with value
function prepareCalendarCell (key: string, value: string): HTMLElement {
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

function prepareDatesCell (key: string, value: string): HTMLElement {
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

// Add rows from calendar.txt to window
async function dumpCalendar (content: HTMLElement) {
    // Create the header
    const header = document.createElement("h5")
    header.append("calendar.txt")
    content.append(header)

    // Create the table
    const table = document.createElement("table")
    content.append(table)

    let wroteHeader: boolean = false

    // Iterate over rows of calendar.txt
    ipcRenderer.on("dump-stream", async (event: IpcRendererEvent, row: Gtfs.Row) => {
        // Write header, if it wasn't written
        if (!wroteHeader) {
            const headerTr = document.createElement("tr")
            table.append(headerTr)

            wroteHeader = true
            const headerElems = Object.keys(row)
                .map(key => prepareHeaderCell(key, "calendar"))
            headerTr.append(...headerElems)
        }

        // Create table row
        const tr = document.createElement("tr")
        table.append(tr)

        const elems = Object.entries(row)
            .map(([key, value]) => prepareCalendarCell(key, <string>value))

        // Add all cells to row
        tr.append(...elems)
    })

    // Request the data dump
    await ipcRenderer.invoke("dump-request", "calendar")

    // Sometimes the dump-stream listiner is removed to quickly.
    // Why? no fucking clue, since dump-request resolves **AFTER** all data was sent
    await new Promise(resolve => setTimeout(resolve, 50))

    ipcRenderer.removeAllListeners("dump-stream")
}

// Add rows from calendar_dates.txt to window
async function dumpDates (content: HTMLElement) {
    // Create the header
    const header = document.createElement("h5")
    header.append("calendar_dates.txt")
    content.append(header)

    // Create the table
    const table = document.createElement("table")
    content.append(table)

    let wroteHeader: boolean = false

    // Iterate over rows of calendar_dates.txt
    ipcRenderer.on("dump-stream", async (event: IpcRendererEvent, rows: Gtfs.Row[]) => {
        const serviceId = rows[0].service_id

        // Write header, if it wasn't written
        if (!wroteHeader) {
            const headerTr = document.createElement("tr")
            table.append(headerTr)

            wroteHeader = true
            const headerElems = Object.keys(rows[0])
                .map(key => prepareHeaderCell(key, "calendar_dates"))
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
                .map(([key, value]) => prepareDatesCell(key, <string>value))

            // Add all cells to row
            tr.append(...elems)
        }
    })

    // Request the data dump
    await ipcRenderer.invoke("dump-request", "calendarDates")
}

export async function init (): Promise<void> {
    const content = document.getElementById("content")

    // Check if content exists
    if (content === null) {
        throw new NoContentInHtml("this document has no element with id=content")
    }

    const [calendarExists, datesExist]: [boolean, boolean] = await Promise.all([
        ipcRenderer.invoke("exists", "calendar"), ipcRenderer.invoke("exists", "calendarDates")
    ])

    // Check if calendar.txt or calendar_dates.txt exist
    if (!calendarExists && !datesExist) {
        const h3 = document.createElement("h3")
        h3.className = "value-error"

        content.append(h3)
        h3.append("Error! File calendar.txt & calendar_dates.txt are not present in the GTFS")
        return
    }

    // Show the 'calendar' table
    if (calendarExists) {
        await dumpCalendar(content)
    }

    // Add a separator
    if (calendarExists && datesExist) { content.append(document.createElement("hr")) }

    // SHow the 'calendarDates' table
    if (datesExist) {
        await dumpDates(content)
    }
}
