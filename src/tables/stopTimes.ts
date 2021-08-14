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

import { validTime } from '../util'
import type * as Gtfs from '../gtfsTypes'

// Valid fields
const validTimesFields = new Set([
  'trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence',
  'stop_headsign', 'pickup_type', 'drop_off_type', 'shape_dist_traveled', 'timepoint'
])

// Functions
export function prepareTimesHeader (key: string): HTMLTableHeaderCellElement {
  const el = document.createElement('th')

  // Set background color for invalid fields
  if (key === '_stop_name' || key === '_trip_headsign' || key === '_trip_short_name') {
    el.className = 'value-inherited'
    key = key.substring(1)
  } else if (key !== '' && !validTimesFields.has(key)) {
    el.className = 'value-unrecognized'
  }

  el.append(key)
  return el
}

export function prepareTimesValue (key: string, value: string, row: Gtfs.Row,
  findStopData: Map<string, string[]>): HTMLTableDataCellElement {
  const cellElem = document.createElement('td')
  let elem: string | HTMLAnchorElement

  switch (key) {
    case 'trip_id':
      elem = document.createElement('a')
      elem.href = `trip.html?id=${encodeURIComponent(value)}`
      elem.append(value)
      break
    case 'arrival_time':
    case 'departure_time':
      if (!validTime(value)) { cellElem.className = 'value-invalid' }
      elem = value
      break
    case 'stop_id':
      elem = document.createElement('a')
      elem.href = `stop.html?id=${encodeURIComponent(value)}`
      elem.append(value)
      break
    case '_stop_name':
      if (!findStopData.has(row.stop_id)) {
        findStopData.set(row.stop_id, [])
      }
      // @ts-expect-error | it's defined above dude
      findStopData.get(row.stop_id).push(row.stop_sequence)

      cellElem.id = 'stop_name_' + row.stop_sequence
      elem = ''
      break
    case 'stop_sequence':
      if (value.match(/^\d+$/) === null) { cellElem.className = 'value-invalid' }
      elem = value
      break
    case 'pickup_type':
    case 'drop_off_type':
      if (value === '' || value === '0') {
        elem = `${value} (🚏)`
      } else if (value === '1') {
        elem = '1 (🚫)'
      } else if (value === '2') {
        elem = '2 (☎️)'
      } else if (value === '3') {
        elem = '3 (👈)'
      } else {
        cellElem.className = 'value-invalid'
        elem = value
      }
      break
    case 'shape_dist_traveled':
      if (value.match(/^\d+(.\d+)?$/) === null) { cellElem.className = 'value-invalid' }
      elem = value
      break
    case 'timepoint':
      if (value === '' || value === '0') {
        elem = `${value} (⌚📌)`
      } else if (value === '1') {
        elem = '1 (⌚🤷)'
      } else {
        cellElem.className = 'value-invalid'
        elem = value
      }
      break
    default:
      elem = value
  }

  cellElem.append(elem)
  return cellElem
}
