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

import { validTime } from "../util"
import { validTimesFields, validFreqFields } from "../validFields"

import * as L from "leaflet"
import "leaflet-extra-markers"

import type * as Gtfs from "../gtfsTypes"

// Prepare the map object
export async function createMap (): Promise<L.Map> {
    const map = L.map("map")
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Tiles &copy; <a href="https://wiki.osmfoundation.org/wiki/Terms_of_Use">OpenStreetMap Foundation</a>',
        maxZoom: 18
    }).addTo(map)

    return map
}

// A handler for creating cell elements of stop_times.txt header
export function prepareTimesHeader (key: string): HTMLElement {
    const el = document.createElement("th")

    // Set background color for invalid fields
    if (key === "stop_name") {
        key = "stop_name (from stops.txt)"
    } else if (key !== "" && !validTimesFields.has(key)) {
        el.className = "value-unrecognized"
    }

    el.append(key)
    return el
}

// A handler for creating cell elements of stop_times.txt values
export function prepareTimesCell (key: string, value: string, row: any,
    findStopData: Map<string, string[]>): HTMLElement {
    const cellElem = document.createElement("td")
    let elem: string | HTMLAnchorElement

    switch (key) {
    case "trip_id":
        elem = document.createElement("a")
        elem.href = `trip.html?id=${encodeURIComponent(value)}`
        elem.append(value)
        break
    case "arrival_time":
    case "departure_time":
        if (!validTime(value)) { cellElem.className = "value-invalid" }
        elem = value
        break
    case "stop_id":
        elem = document.createElement("a")
        elem.href = `stop.html?id=${encodeURIComponent(value)}`
        elem.append(value)
        break
    case "stop_name":
        if (!findStopData.has(row.stop_id)) {
            findStopData.set(row.stop_id, [])
        }
        // @ts-ignore | it's defined above dude
        findStopData.get(row.stop_id).push(row.stop_sequence)

        cellElem.id = "stop_name_" + row.stop_sequence
        elem = ""
        break
    case "stop_sequence":
        if (value.match(/^\d+$/) === null) { cellElem.className = "value-invalid" }
        elem = value
        break
    case "pickup_type":
    case "drop_off_type":
        if (value === "" || value === "0") {
            elem = `${value} (🚏)`
        } else if (value === "1") {
            elem = "1 (🚫)"
        } else if (value === "2") {
            elem = "2 (☎️)"
        } else if (value === "3") {
            elem = "3 (👈)"
        } else {
            cellElem.className = "value-invalid"
            elem = value
        }
        break
    case "shape_dist_traveled":
        if (value.match(/^\d+(.\d+)?$/) === null) { cellElem.className = "value-invalid" }
        elem = value
        break
    case "timepoint":
        if (value === "" || value === "0") {
            elem = `${value} (⌚📌)`
        } else if (value === "1") {
            elem = "1 (⌚🤷)"
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

/**
 * Prepares a <th> element for a frequencies.txt column
 * @param key column name
 */
export function prepareFreqHeader (key: string): HTMLTableHeaderCellElement {
    const el = document.createElement("th")

    // Set background color for invalid fields
    if (key !== "" && !validFreqFields.has(key)) {
        el.className = "value-unrecognized"
    }

    el.append(key)
    return el
}

/**
 * Creates a <tr> element for a frequencies.txt cell
 * @param key column name
 * @param value cell value
 */
export function prepareFreqCell (key: string, value: string): HTMLTableDataCellElement {
    const cellElem = document.createElement("td")
    let elem: string | HTMLAnchorElement

    switch (key) {
    case "trip_id":
        elem = document.createElement("a")
        elem.href = `/trip.html?id=${encodeURIComponent(value)}`
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

/**
 * Get a list of keys of a given stop_times row, with added column for stop_name.
 */
export function rowKeysWithStopName (obj: Gtfs.Row): string[] {
    const kList = Object.keys(obj)
    const stopIdIdx = kList.indexOf("stop_id")

    if (stopIdIdx >= 0) {
        kList.splice(stopIdIdx, 0, "stop_name")
    }

    return kList
}

/**
 * Get a list of [key, value] pairs of a given stop_times row,
 * with added column for stop_name.
 */
export function rowEntriesWithStopName (obj: Gtfs.Row): [string, string][] {
    const kvList = Object.entries(obj)
    const stopIdIdx = kvList.map(i => i[0]).indexOf("stop_id")

    if (stopIdIdx >= 0) {
        kvList.splice(stopIdIdx, 0, ["stop_name", ""])
    }

    return kvList
}

/**
 * Creates a nice popup to display current stop on the map
 */
function getStopPopup (row: Gtfs.Row, stopIdxs: string[]): HTMLSpanElement {
    const popup = document.createElement("span")

    const linkB = document.createElement("b")
    const link = document.createElement("a")
    link.href = `stop.html?id=${encodeURIComponent(row.stop_id)}`
    link.append("View stop →")
    linkB.append(link)
    popup.append(linkB)
    popup.append(document.createElement("br"))
    popup.append(`stop_id: ${row.stop_id}`)
    popup.append(document.createElement("br"))
    popup.append(`stop_name: ${row.stop_name}`)
    popup.append(document.createElement("br"))
    popup.append(`stop_sequence: ${stopIdxs.join(", ")}`)

    return popup
}

/**
 * Add info about stops from stops.txt
 * @param findStopData maps stop_id -> [stop_sequence, stop_sequence, ...]
 * @param map the Leaflet map to add points to
 */
export async function fetchStopData (findStopData: Map<string, string[]>, map: L.Map) {
    const mapStops = L.featureGroup()

    for (const [stopId, stopIdxs] of findStopData) {
        // Fetch data for this stopId
        const stopData = await ipcRenderer.invoke("find", "stops", stopId)

        // Add stop_name to stop_times rows
        stopIdxs.forEach(async stopIdx => {
            const cell = document.getElementById("stop_name_" + stopIdx)
            if (cell !== null) { cell.append(stopData.stop_name) }
        })

        // Create a marker
        const popup = getStopPopup(stopData, stopIdxs)
        const icon = L.ExtraMarkers.icon({
            icon: "fa-number",
            number: stopIdxs.join("/"),
            markerColor: "green"
        })

        const stopPos: [number, number] = [parseFloat(stopData.stop_lat), parseFloat(stopData.stop_lon)]

        const marker = L.marker(stopPos, { icon: icon })
        marker.bindPopup(popup)

        mapStops.addLayer(marker)
    }

    mapStops.addTo(map)
    map.fitBounds(mapStops.getBounds())
}

/**
 * Add a line to the map representing the reffered shape_id
 */
export async function fetchShapeData (shapeId: string | undefined | null, map: L.Map) {
    if (typeof shapeId !== "string") { return }

    // Load points from shapes.txt
    const points = await ipcRenderer.invoke("find", "shapes", shapeId) as null | [number, number][]

    if (points === null) { return }

    // Add points to the map
    L.polyline(
        points,
        { weight: 5 }
    ).addTo(map)
}
