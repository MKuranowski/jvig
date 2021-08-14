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

import { ipcRenderer } from 'electron'

import { NoContentInHtml } from '../errs'
import { prepareTripsHeader, prepareTripsValue } from '../tables/trips'
import { prepareTimesHeader, prepareTimesValue } from '../tables/stopTimes'
import { prepareFreqHeader, prepareFreqValue } from '../tables/frequencies'

import * as Gtfs from '../gtfsTypes'

// Functions
import * as f from './tripFunctions'

// Leaflet
import type * as L from 'leaflet'

// Globals
var map: L.Map

/**
 * Creates a div which shows info from trips.txt
 * @param tripId
 */
async function makeTripDiv (tripId: string, tripData: null | Gtfs.Row): Promise<HTMLDivElement> {
  const div = document.createElement('div')

  if (tripData === null) {
    const h3 = document.createElement('h3')
    h3.className = 'value-error'

    if ((await ipcRenderer.invoke('exists', 'trips')) as boolean) {
      h3.append(`Error! Trip ${tripId} not found in trips.txt`)
    } else {
      h3.append('Error! File trips.txt not present in the GTFS')
    }

    div.append(h3)
  } else {
    const h5 = document.createElement('h5')
    h5.append('Trip Info')

    const table = document.createElement('table')
    let row: HTMLTableRowElement

    div.append(h5, table)

    row = document.createElement('tr')
    table.append(row)
    row.append(
      ...(f.rowKeysWithStopName(tripData).map(prepareTripsHeader))
    )

    row = document.createElement('tr')
    table.append(row)
    row.append(
      ...(f.rowEntriesWithStopName(tripData).map(([k, v]) => prepareTripsValue(k, v)))
    )
  }

  return div
}

/**
 * Creates a div which shows data from stop_times.txt
 * @param tripId
 * @param findStopData
 */
async function makeTimesDiv (tripId: string, findStopData: Map<string, string[]>):
Promise<HTMLDivElement> {
  const div = document.createElement('div')
  const timesRows = await ipcRenderer.invoke('find', 'stopTimes', tripId) as null | Gtfs.Row[]
  let wroteHeader: boolean = false

  div.append(document.createElement('hr'))

  if (timesRows === null) {
    const h3 = document.createElement('h3')
    h3.className = 'value-error'

    if ((await ipcRenderer.invoke('exists', 'stopTimes')) as boolean) {
      h3.append(`Error! Trip ${tripId} not found in stop_times.txt`)
    } else {
      h3.append('Error! File stop_times.txt not present in the GTFS')
    }

    div.append(h3)
  } else {
    const h5 = document.createElement('h5')
    h5.append('Stop Times')

    const table = document.createElement('table')

    div.append(h5, table)

    timesRows.forEach(row => {
      if (!wroteHeader) {
        // Write header, if it wasn't written
        const headerTr = document.createElement('tr')
        table.append(headerTr)

        wroteHeader = true
        headerTr.append(...(f.rowKeysWithStopName(row).map(prepareTimesHeader)))
      }

      // Write the normal row
      const tr = document.createElement('tr')
      table.append(tr)
      tr.append(
        ...(f.rowEntriesWithStopName(row)
          .map(([k, v]) => prepareTimesValue(k, v, row, findStopData))
        )
      )
    })
  }

  return div
}

/**
 * Creates a div which shows data from frequencies.txt
 * @param tripId
 */
async function makeFreqDiv (tripId: string): Promise<null | HTMLDivElement> {
  // Get data from frequencies, and return null if this is not a frequency-based trip
  const timesRows = await ipcRenderer.invoke('find', 'frequencies', tripId) as null | Gtfs.Row[]
  if (timesRows === null) { return null }

  // Create HTML elements
  const div = document.createElement('div')
  let wroteHeader: boolean = false

  div.append(document.createElement('hr'))

  const h5 = document.createElement('h5')
  h5.append('Frequencies')

  const table = document.createElement('table')

  div.append(h5, table)

  timesRows.forEach(row => {
    if (!wroteHeader) {
      // Write header, if it wasn't written
      const headerTr = document.createElement('tr')
      table.append(headerTr)

      wroteHeader = true
      headerTr.append(
        ...(Object.keys(row)
          .map(k => prepareFreqHeader(k)))
      )
    }

    // Write the normal row
    const tr = document.createElement('tr')
    table.append(tr)
    tr.append(
      ...(Object.entries(row)
        .map(([k, v]) => prepareFreqValue(k, v)))
    )
  })

  return div
}

export async function init (): Promise<void> {
  const content = document.getElementById('content')
  const stopDataMap: Map<string, string[]> = new Map()

  // Check if content exists
  if (content === null) {
    throw new NoContentInHtml('this document has no element with id=content')
  }

  const tripId = (new URLSearchParams(window.location.search)).get('id')
  const tripData = await ipcRenderer.invoke('find', 'trips', tripId) as null | Gtfs.Row

  if (tripId === null) {
    const h3 = document.createElement('h3')
    h3.className = 'value-error'

    content.append(h3)
    h3.append('Error! Missing id parameter.')
    return
  }

  // Create div elements and the map
  const result = await Promise.all([
    makeTripDiv(tripId, tripData),
    makeTimesDiv(tripId, stopDataMap),
    makeFreqDiv(tripId),
    f.createMap()
  ])

  const [divTrip, divTimes, divFreq] = [result[0], result[1], result[2]]
  map = result[3]

  content.append(divTrip, divTimes)
  if (divFreq !== null) { content.append(divFreq) }

  // Create the map and populate stopNames
  await Promise.all([
    f.fetchStopData(stopDataMap, map),
        f.fetchShapeData(tripData?.shape_id, map) // eslint-disable-line
  ])
}
