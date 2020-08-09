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
import { validLat, validLon } from "../util"
import { prepareStopsHeader, prepareStopsValue } from "../tables/stops"
import { prepareTimesHeader, prepareTimesValue } from "../tables/stopTimes"
import * as Gtfs from "../gtfsTypes"

// Leaflet
import * as L from "leaflet"
import "leaflet-extra-markers"

// Globals
var map: L.Map

// Prepare the map object
function createMap (): void {
    map = L.map("map")
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Tiles &copy; <a href="https://wiki.osmfoundation.org/wiki/Terms_of_Use">OpenStreetMap Foundation</a>',
        maxZoom: 18
    }).addTo(map)
}

function makeMarker (row: Gtfs.Row, idx: string): L.Marker | undefined {
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
    if (row.location_type) {
        popup.append(document.createElement("br"), `location_type: ${row.location_type}`)
    }

    // Select an icon
    const icon = L.ExtraMarkers.icon({
        icon: "fa-number",
        number: idx,
        markerColor: idx === "0" ? "green" : "red"
    })

    // Create leaflet marker
    const m = L.marker([lat, lon], { icon: icon })
    m.bindPopup(popup)

    return m
}

/**
 * Decides how to show data from stops.txt
 * Preforms a side-effect of appending data to the div and adding markers to the map
 * @param stopId
 * @param map
 */
async function handleStops (stopId: string, map: L.Map, div: HTMLDivElement): Promise<void> {
    const stopData = await ipcRenderer.invoke("find", "stops", stopId) as Gtfs.Row | null

    if (stopData === null) {
        const h3 = document.createElement("h3")
        h3.className = "value-error"

        if (await ipcRenderer.invoke("exists", "stops")) {
            h3.append(`Error! Stop ${stopId} not found in stops.txt`)
        } else {
            h3.append("Error! File stops.txt not present in the GTFS")
        }

        div.append(h3)
    } else {
        const h5 = document.createElement("h5")
        h5.append("Stop Data")

        const table = document.createElement("table")
        let row: HTMLTableRowElement

        div.append(h5, table)

        // Add main stop to the table
        row = document.createElement("tr")
        table.append(row)
        row.append(
            ...(["", "", ...Object.keys(stopData)].map(prepareStopsHeader))
        )

        row = document.createElement("tr")
        table.append(row)
        row.append(
            ...([["", "0"], ["", ""], ...Object.entries(stopData)]
                .map(([k, v]) => prepareStopsValue(k, v)))
        )

        // Add main stop to map
        const marker = makeMarker(stopData, "0")
        if (marker !== undefined) {
            marker.addTo(map)
            map.setView(marker.getLatLng(), 16)
        }

        // Add other stops from station to the table, if such exist
        let otherStops: string[] | null = null
        if (stopData.location_type === "1") {
            otherStops = await ipcRenderer.invoke("find", "_stopChildren", stopId)
        } else if (stopData.parent_station) {
            otherStops = await ipcRenderer.invoke("find", "_stopChildren", stopData.parent_station)
        }

        if (otherStops !== null) {
            // Do not re-add current stop
            let thisIndex = otherStops.indexOf(stopId)
            while (thisIndex > -1) {
                otherStops.splice(thisIndex, 1)
                thisIndex = otherStops.indexOf(stopId)
            }

            // Create a fake row
            row = document.createElement("tr")
            const spannedCell = document.createElement("td")
            spannedCell.colSpan = Object.keys(stopData).length + 2
            spannedCell.className = "align-center"
            spannedCell.append("Other stations belonging to this station group:")

            row.append(spannedCell)
            table.append(row)

            // Add the parent first
            if (stopData.location_type !== "1") { otherStops.unshift(stopData.parent_station) }

            // Create table rows for each stop
            for (let idx = 1; idx <= otherStops.length; idx++) {
                const otherStopId = otherStops[idx - 1]
                const otherStopData = await ipcRenderer.invoke("find", "stops", otherStopId) as null | Gtfs.Row

                // Add to the table
                if (otherStopData === null) { continue }
                const otherRow = document.createElement("tr")
                otherRow.append(
                    ...[["", idx.toString()], ["_link_departures", otherStopId], ...Object.entries(otherStopData)]
                        .map(([k, v]) => prepareStopsValue(k, v))
                )
                table.append(otherRow)

                // Add to the map
                const otherMarker = makeMarker(otherStopData, idx.toString())
                if (otherMarker !== undefined) { otherMarker.addTo(map) }
            }
        }
    }
}

/**
 * Decides how to show data from stop_times.txt.
 * Preforms a side-effect of appending data to the div
 * @param stopId
 * @param table
 */
async function handleStopTimes (stopId: string, div: HTMLDivElement): Promise<void> {
    let wroteHeader: boolean = false

    // Add elements to the div
    const h5 = document.createElement("h5")
    h5.append("Stop Times")
    const table = document.createElement("table")

    div.append(document.createElement("hr"), h5, table)

    const emptyMap = new Map()

    // Define a handler for incoming data
    ipcRenderer.on("dump-stream-stopTimes", async (event: IpcRendererEvent, rows: Gtfs.Row[]) => {
        rows.filter(row => row.stop_id === stopId).forEach(row => {
            if (!wroteHeader) {
                // Write header, if it wasn't written
                const headerTr = document.createElement("tr")
                table.append(headerTr)

                wroteHeader = true
                const headerElems = Object.keys(row).map(key => prepareTimesHeader(key))
                headerTr.append(...headerElems)
            }

            // Write the normal row
            const tr = document.createElement("tr")
            table.append(tr)

            const elems = Object.entries(row)
                .map(([key, value]) => prepareTimesValue(key, value, row, emptyMap))

            // Add all cells to row
            tr.append(...elems)
        })
    })

    // Request the data dump
    await ipcRenderer.invoke("dump-request", "stopTimes")

    // Wait a bit after dump-request finishes (had some issues without a timeout)
    // And remove listener from dump-stream channel
    await new Promise(resolve => setTimeout(resolve, 50))
    ipcRenderer.removeAllListeners("dump-stream-stopTimes")
}

export async function init () {
    const content = document.getElementById("content")

    // Check if content exists
    if (content === null) {
        throw new NoContentInHtml("this document has no element with id=content")
    }

    const stopId = (new URLSearchParams(window.location.search)).get("id")

    if (stopId === null) {
        const h3 = document.createElement("h3")
        h3.className = "value-error"

        content.append(h3)
        h3.append("Error! Missing id parameter.")
        return
    }

    // Create the map
    createMap()
    const stopDiv = document.createElement("div")
    const timesDiv = document.createElement("div")

    content.append(stopDiv, timesDiv)

    await Promise.all([
        handleStops(stopId, map, stopDiv), handleStopTimes(stopId, timesDiv)
    ])
}
