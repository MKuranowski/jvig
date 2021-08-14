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

import { safeColor } from '../util'

// Valid fields
const validRoutesFields = new Set([
  'route_id', 'agency_id', 'route_short_name', 'route_long_name', 'route_type', 'route_desc',
  'route_url', 'route_color', 'route_text_color', 'route_sort_order'
])

// route_type icons & if they are extended
const routeTypeData: Map<string, [string, boolean]> = new Map([
  ['0', ['🚊', false]], ['1', ['🚇', false]], ['2', ['🚆', false]],
  ['3', ['🚌', false]], ['4', ['⛴️', false]], ['5', ['🚋', false]],
  ['6', ['🚠', false]], ['7', ['🚞', false]], ['11', ['🚎', false]],
  ['12', ['🚝', false]],
  ['100', ['🚆', true]], ['101', ['🚅', true]], ['102', ['🚆', true]],
  ['103', ['🚆', true]], ['105', ['🚆', true]], ['106', ['🚆', true]],
  ['107', ['🚂', true]], ['108', ['🚆', true]], ['109', ['🚆', true]],
  ['200', ['🚌', true]], ['201', ['🚌', true]], ['202', ['🚌', true]],
  ['204', ['🚌', true]], ['400', ['🚇', true]], ['401', ['🚇', true]],
  ['402', ['🚇', true]], ['403', ['🚇', true]], ['405', ['🚝', true]],
  ['700', ['🚍', true]], ['701', ['🚍', true]], ['702', ['🚍', true]],
  ['704', ['🚍', true]], ['715', ['🚍', true]], ['717', ['🚐', true]],
  ['800', ['🚎', true]], ['900', ['🚊', true]], ['907', ['🚋', true]],
  ['1000', ['⛴️', true]], ['1300', ['🚠', true]], ['1400', ['🚞', true]],
  ['1700', ['❓', true]]
])

// Functions
export function prepareRoutesHeader (key: string): HTMLTableHeaderCellElement {
  const el = document.createElement('th')
  el.append(key)

  // Set a khaki background for unrecognized field names
  if (key !== '' && !validRoutesFields.has(key)) { el.className = 'value-unrecognized' }

  return el
}

export function prepareRoutesValue (key: string, value: string, row: any):
HTMLTableDataCellElement {
  const cellElem = document.createElement('td')
  let elem: string | HTMLAnchorElement | HTMLSpanElement

  switch (key) {
    case '_link_trips':
      elem = document.createElement('a')
      ;(elem as HTMLAnchorElement).href = `trips.html?route=${encodeURIComponent(value)}`
      elem.append('Route trips →')
      break

    case 'route_color':
    case 'route_text_color':
      if (safeColor(value) === null) { cellElem.className = 'value-invalid' }
      elem = value
      break

    case 'route_type':
      if (!routeTypeData.has(value)) {
        // Invalid route_id
        cellElem.className = 'value-invalid'
        elem = value
      } else {
        let icon: string = ''
        let isExtended: boolean = false
        let isInvalid: boolean = false

        // Fetch data from routeTypeData
        const thisRouteTypeData = routeTypeData.get(value)

        if (thisRouteTypeData !== undefined) {
          [icon, isExtended] = thisRouteTypeData
        } else {
          isInvalid = true
        }

        // Set styles based on data validity
        if (isInvalid) {
          cellElem.className = 'value-invalid'
          elem = value
        } else if (isExtended) {
          cellElem.className = 'value-extended'
          elem = `${value} (${icon})`
        } else {
          elem = `${value} (${icon})`
        }
      }
      break

    case 'route_short_name':
      if (row.route_color !== undefined && row.route_text_color !== undefined) {
        const color = safeColor(row.route_color)
        const textColor = safeColor(row.route_text_color)

        if (color === null || textColor === null) {
          elem = value
        } else {
          // Create a nice box with route color around route_short_name
          let style = `background-color: ${color}; color: ${textColor}; ` +
                    'border-radius: 4px; padding: 2px; margin: 2px;'

          if (value === '') {
            style += ' display: block; width: 14px; height: 14px;'
          }

          cellElem.className = 'short-name-with-blob'
          elem = document.createElement('span')
          elem.setAttribute('style', style)
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
