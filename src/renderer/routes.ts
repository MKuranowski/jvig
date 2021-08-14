/*
jvig - GTFS Viewer application written using Typescript & Electron
Copyright © 2020-2021 Mikołaj Kuranowski

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
import { prepareRoutesHeader, prepareRoutesValue } from '../tables/routes'
import type * as Gtfs from '../gtfsTypes'

export async function init (): Promise<void> {
  const content = document.getElementById('content')
  let wroteHeader: boolean = false

  // Check if content exists
  if (content === null) {
    throw new NoContentInHtml('this document has no element with id=content')
  }

  // Check if we should filter by a specific agency_id
  const expectedAgency = (new URLSearchParams(window.location.search)).get('agency')

  // Check if routes table exist
  const exists = await ipcRenderer.invoke('exists', 'routes') as boolean

  if (!exists) {
    const h3 = document.createElement('h3')
    h3.className = 'value-error'

    content.append(h3)
    h3.append('Error! File routes.txt is not present in the GTFS')
  }

  // Create HTML table
  const table = document.createElement('table')
  content.append(table)

  // Add a handler for data
  ipcRenderer.on('dump-stream-routes', async (event: IpcRendererEvent, ...args: [Gtfs.Row]) => {
    const row = args[0]
    if (!wroteHeader) {
      // Write header, if it wasn't written
      const headerTr = document.createElement('tr')
      table.append(headerTr)

      wroteHeader = true
      const headerElements = ['', ...Object.keys(row)]
        .map(key => prepareRoutesHeader(key))
      headerTr.append(...headerElements)
    }

    // Skip this row if we it doesn't match the expected agency
    if (expectedAgency !== null && expectedAgency !== row.agency_id) { return }

    // Write the normal row
    const tr = document.createElement('tr')
    table.append(tr)

    const elements = [['_link_trips', row.route_id], ...Object.entries(row)]
      .map(([key, value]) => prepareRoutesValue(key, value, row))

    // Add all cells to row
    tr.append(...elements)
  })

  // Request data
  await ipcRenderer.invoke('dump-request', 'routes')

  // Wait a bit after dump-request finishes (had some issues without a timeout)
  // And remove listener from dump-stream channel
  await new Promise(resolve => setTimeout(resolve, 50))
  ipcRenderer.removeAllListeners('dump-stream-routes')
}
