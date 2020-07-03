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

// Local imports
import { NoContentInHtml } from "../errs"
import { validLat, validLon } from "../util"
import { validStopsFields } from "../validFields"

import type * as Gtfs from "../gtfsTypes"

// Leaflet
import * as L from "leaflet"
import "leaflet.markercluster"

// Define the Leaflet map object as a global variable
var map: L.Map
var markers: L.FeatureGroup

// Prepare the map object
async function createMap (): Promise<L.FeatureGroup> {
    map = L.map("map")
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Tiles &copy; <a href="https://wiki.osmfoundation.org/wiki/Terms_of_Use">OpenStreetMap Foundation</a>',
        maxZoom: 18
    }).addTo(map)

    // markerClusterGroup is defined outside standard Leaflet
    markers = (L as any).markerClusterGroup()
    markers.addTo(map)

    return markers
}

// Creates a marker for a stop
async function createMarker (markerGroup: L.FeatureGroup, row: any) {
    const popup = document.createElement("span")

    // Check if this stop has correct position
    const lat = validLat(row.stop_lat)
    const lon = validLon(row.stop_lon)

    if (lat === null || lon === null) { return }

    // Add link to stop.html
    const boldAnchor = document.createElement("b")
    const anchor = document.createElement("a")
    anchor.href = `stop.html?id=${encodeURIComponent(row.stop_id)}`
    anchor.append("Stop departures →")
    boldAnchor.append(anchor)
    popup.append(boldAnchor, document.createElement("br"))

    // Add stop_id to popup
    popup.append(`stop_id: ${row.stop_id}`, document.createElement("br"))

    // Add stop_code to popup
    if (row.stop_code !== undefined) {
        popup.append(`stop_code: ${row.stop_code}`, document.createElement("br"))
    }

    // Add stop_name to popup
    popup.append(`stop_name: ${row.stop_name}`)

    // Create leaflet marker
    const m = L.marker([lat, lon])
    m.bindPopup(popup)
    m.addTo(markerGroup)
}

// A handler for createing cell elements of the CSV header
export function prepareHeaderCell (key: string): HTMLElement {
    const el = document.createElement("th")
    el.append(key)

    // Set a khaki background for unrecognized field names
    if (key !== "" && !validStopsFields.has(key)) { el.className = "value-unrecognized" }

    return el
}

// A handler for creating cell elements of a normal row
export function prepareValueCell (key: string, value: string): HTMLElement {
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

export async function init (): Promise<void> {
    const content = document.getElementById("content")
    let wroteHeader: boolean = false

    // Check if content exists
    if (content === null) {
        throw new NoContentInHtml("this document has no element with id=content")
    }

    // Create leaflet and check if stops table exists
    const [markerGroup, exists] = await Promise.all([
        createMap(), ipcRenderer.invoke("exists", "stops")
    ])

    if (!exists) {
        const h3 = document.createElement("h3")
        h3.className = "value-error"

        content.append(h3)
        h3.append("Error! File stops.txt is not present in the GTFS")
    }

    // Create HTML table
    const table = document.createElement("table")
    content.append(table)

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

        // Parallelize marker creation and adding rows to table
        await Promise.all([
            createMarker(markerGroup, row),
            (async () => {
                // Write the normal row
                const tr = document.createElement("tr")
                table.append(tr)

                const elems = [["_link_departures", row.stop_id], ...Object.entries(row)]
                    .map(([key, value]) => prepareValueCell(key, value))

                // Add all cells to row
                tr.append(...elems)
            })()
        ])
    })

    // Request the data dump
    await ipcRenderer.invoke("dump-request", "stops")

    // Move to all stops
    map.fitBounds(markerGroup.getBounds())
}
