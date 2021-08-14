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

// Valid fields
const validAgencyFields = new Set([
  'agency_id', 'agency_name', 'agency_url', 'agency_timezone', 'agency_lang', 'agency_phone',
  'agency_fare_url', 'agency_email'
])

// Functions
export function prepareAgencyHeader (key: string): HTMLTableHeaderCellElement {
  const el = document.createElement('th')
  el.append(key)

  // Set a khaki background for unrecognized field names
  if (key !== '' && !validAgencyFields.has(key)) { el.className = 'value-unrecognized' }

  return el
}

export function prepareAgencyValue (key: string, value: string): HTMLTableDataCellElement {
  const cellElem = document.createElement('td')
  let elem: string | HTMLAnchorElement

  switch (key) {
    case '_link_routes':
      elem = document.createElement('a')
      elem.href = `routes.html?agency=${encodeURIComponent(value)}`
      elem.append('Agency routes →')
      break
    default:
      elem = value
  }

  cellElem.append(elem)
  return cellElem
}
