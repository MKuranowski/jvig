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
/* eslint-disable @typescript-eslint/no-misused-promises */

import { ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

import { NoContentInHtml } from '../errs'
import { prepareTripsHeader, prepareTripsValue } from '../tables/trips'
import type * as Gtfs from '../gtfsTypes'

export async function init (): Promise<void> {
  const content = document.getElementById('content')
  let wroteHeader: boolean = false

  // Check if content exists
  if (content === null) {
    throw new NoContentInHtml('this document has no element with id=content')
  }

  // Check if we should filter by a specific route_id/block_id
  const urlParams = new URLSearchParams(window.location.search)
  const expectedRoute = urlParams.get('route')
  const expectedBlock = urlParams.get('block')

  if (expectedRoute === null && expectedBlock === null) {
    const h3 = document.createElement('h3')
    h3.className = 'value-error'

    content.append(h3)
    h3.append('Error! Missing route/block parameters.')
    return
  }

  // Check if trips.txt exists
  const exists = await ipcRenderer.invoke('exists', 'trips') as boolean

  if (!exists) {
    const h3 = document.createElement('h3')
    h3.className = 'value-error'

    content.append(h3)
    h3.append('Error! File trips.txt is not present in the GTFS')
    return
  }

  // Create HTML elements
  const table = document.createElement('table')
  content.append(table)

  // Add a handler when data arrives
  ipcRenderer.on('dump-stream-trips', async (event: IpcRendererEvent, row: Gtfs.Row) => {
    if (!wroteHeader) {
      // Write header, if it wasn't written
      const headerTr = document.createElement('tr')
      table.append(headerTr)

      wroteHeader = true
      const headerElements = ['', ...Object.keys(row), '_start_time', '_end_time']
        .map(key => prepareTripsHeader(key))
      headerTr.append(...headerElements)
    }

    // Check against route_id / block_id filters
    if (expectedRoute !== null && expectedRoute !== row.route_id) {
      return
    } else if (expectedBlock !== null && expectedBlock !== row.block_id) {
      return
    }

    // Get stopTimes
    const times = await ipcRenderer.invoke('find', 'stopTimes', row.trip_id) as null | Gtfs.Row[]
    let startTime: string
    let endTime: string
    if (times !== null) {
      startTime = times[0].arrival_time || times[0].departure_time || '' // eslint-disable-line @typescript-eslint/strict-boolean-expressions
      endTime = times[times.length - 1].departure_time || // eslint-disable-line @typescript-eslint/strict-boolean-expressions
                times[times.length - 1].arrival_time || ''
    } else {
      startTime = ''
      endTime = ''
    }

    // Write the normal row
    const tr = document.createElement('tr')
    table.append(tr)

    const elements = [
      ['_link_times', row.trip_id], ...Object.entries(row),
      ['_start_time', startTime], ['_end_time', endTime]
    ].map(([key, value]) => prepareTripsValue(key, value))

    // Add all cells to row
    tr.append(...elements)
  })

  // Request the data dump
  await ipcRenderer.invoke('dump-request', 'trips')

  // Wait a bit after dump-request finishes (had some issues without a timeout)
  // And remove listener from dump-stream channel
  await new Promise(resolve => setTimeout(resolve, 50))
  ipcRenderer.removeAllListeners('dump-stream-trips')
}
