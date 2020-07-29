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
import { validRoutesFields } from "../validFields"

import type { IpcRendererEvent } from "electron"
import type * as Gtfs from "../gtfsTypes"

// Some data
const routeTypeData = new Map([
    ["0", ["🚊", false]], ["1", ["🚇", false]], ["2", ["🚆", false]],
    ["3", ["🚌", false]], ["4", ["⛴️", false]], ["5", ["🚋", false]],
    ["6", ["🚠", false]], ["7", ["🚞", false]], ["11", ["🚎", false]],
    ["12", ["🚝", false]],
    ["100", ["🚆", true]], ["101", ["🚅", true]], ["102", ["🚆", true]],
    ["103", ["🚆", true]], ["105", ["🚆", true]], ["106", ["🚆", true]],
    ["107", ["🚂", true]], ["108", ["🚆", true]], ["109", ["🚆", true]],
    ["200", ["🚌", true]], ["201", ["🚌", true]], ["202", ["🚌", true]],
    ["204", ["🚌", true]], ["400", ["🚇", true]], ["401", ["🚇", true]],
    ["402", ["🚇", true]], ["403", ["🚇", true]], ["405", ["🚝", true]],
    ["700", ["🚍", true]], ["701", ["🚍", true]], ["702", ["🚍", true]],
    ["704", ["🚍", true]], ["715", ["🚍", true]], ["717", ["🚐", true]],
    ["800", ["🚎", true]], ["900", ["🚊", true]], ["907", ["🚋", true]],
    ["1000", ["⛴️", true]], ["1300", ["🚠", true]], ["1400", ["🚞", true]],
    ["1700", ["❓", true]]
])

function safeColor (rawValue: string | undefined): string | null {
    if (rawValue === undefined) {
        return null
    } else if (/^[0-9A-Fa-f]{6}$/.test(rawValue)) {
        return "#" + rawValue.toUpperCase()
    } else {
        return null
    }
}

// A handler for createing cell elements of the CSV header
function prepareHeaderCell (key: string): HTMLElement {
    const el = document.createElement("th")
    el.append(key)

    // Set a khaki background for unrecognized field names
    if (key !== "" && !validRoutesFields.has(key)) { el.className = "value-unrecognized" }

    return el
}

// A handler for creating cell with value
function prepareValueCell (key: string, value: string, row: any): HTMLElement {
    const cellElem = document.createElement("td")
    let elem: string | HTMLAnchorElement | HTMLSpanElement

    switch (key) {
    case "_link_trips":
        elem = document.createElement("a")
        ;(elem as HTMLAnchorElement).href = `trips.html?route=${encodeURIComponent(value)}`
        elem.append("Route trips →")
        break
    case "route_color":
    case "route_text_color":
        if (safeColor(value) === null) { cellElem.className = "value-invalid" }
        elem = value
        break
    case "route_type":
        if (!routeTypeData.has(value)) {
            // Invalid route_id
            cellElem.className = "value-invalid"
            elem = value
        } else {
            // @ts-ignore || I have no clue why ts doesn't understand that
            const [icon, isExtended] = routeTypeData.get(value)

            if (isExtended) { cellElem.className = "value-extended" }
            elem = `${value} (${icon})`
        }
        break
    case "route_short_name":

        if (row.route_color !== undefined && row.route_text_color !== undefined) {
            const color = safeColor(row.route_color)
            const textColor = safeColor(row.route_text_color)

            if (color === null || textColor === null) {
                elem = value
            } else {
                // Create a nice box with route color around route_short_name
                let style = `background-color: ${color}; color: ${textColor}; ` +
                    "border-radius: 4px; padding: 2px; margin: 2px;"

                if (value === "") {
                    style += " display: block; width: 14px; height: 14px;"
                }

                cellElem.className = "short-name-with-blob"
                elem = document.createElement("span")
                elem.setAttribute("style", style)
                elem.append(value)
            }
        } else {
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

    // Check if we should filter by a specific agency_id
    const expectedAgency = (new URLSearchParams(window.location.search)).get("agency")

    // Check if routes table exist
    const exists = await ipcRenderer.invoke("exists", "routes") as boolean

    if (!exists) {
        const h3 = document.createElement("h3")
        h3.className = "value-error"

        content.append(h3)
        h3.append("Error! File agency.txt is not present in the GTFS")
    }

    // Create HTML table
    const table = document.createElement("table")
    content.append(table)

    // Add a handler for data
    ipcRenderer.on("dump-stream", async (event: IpcRendererEvent, ...args: [Gtfs.Row]) => {
        const row = args[0]
        if (!wroteHeader) {
            // Write header, if it wasn't written
            const headerTr = document.createElement("tr")
            table.append(headerTr)

            wroteHeader = true
            const headerElems = ["", ...Object.keys(row)]
                .map(key => prepareHeaderCell(key))
            headerTr.append(...headerElems)
        }

        // Skip this row if we it doesn't match the expected agency
        if (expectedAgency !== null && expectedAgency !== row.agency_id) { return }

        // Write the normal row
        const tr = document.createElement("tr")
        table.append(tr)

        const elems = [["_link_trips", row.route_id], ...Object.entries(row)]
            .map(([key, value]) => prepareValueCell(key, value, row))

        // Add all cells to row
        tr.append(...elems)
    })

    // Request data
    await ipcRenderer.invoke("dump-request", "routes")
}
