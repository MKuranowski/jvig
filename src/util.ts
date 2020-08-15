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

/**
 * Checks if given latitude can exist
 * @param latS latitude in a string
 */
export function validLat (latS: undefined | string): null | number {
    if (latS === undefined) { return null }

    const latN = parseFloat(latS)

    if (isNaN(latN) || Math.abs(latN) > 90) { return null }

    return latN
}

/**
 * Checks if given longitude can exist
 * @param lonS longitude in a string
 */
export function validLon (lonS: undefined | string): null | number {
    if (lonS === undefined) { return null }
    const lonN = parseFloat(lonS)

    if (isNaN(lonN) || Math.abs(lonN) > 180) { return null }
    return lonN
}

/**
 * Checks if given date is real
 * @param dateString YYYYMMDD date representation
 */
export function validDate (dateString: string): boolean {
    if (dateString.length !== 8) { return false }

    const year = parseInt(dateString.slice(0, 4))
    const monthIdx = parseInt(dateString.slice(4, 6)) - 1
    const day = parseInt(dateString.slice(6, 8))

    const date = new Date(year, monthIdx, day)

    if (isNaN(date.valueOf()) ||
            date.getFullYear() !== year ||
            date.getMonth() !== monthIdx ||
            date.getDate() !== day) {
        return false
    } else {
        return true
    }
}

/**
 * Checks if given GTFS arrival_time/departure_time is valid
 * @param timeS HH:MM:SS
 */
export function validTime (timeS: string): boolean {
    // Only HH:MM:SS or H:MM:SS are valid
    const timeM = timeS.match(/^(\d{1,2}):(\d\d):(\d\d)$/)

    if (timeM === null) { return false }

    const m = parseInt(timeM[2])
    const s = parseInt(timeM[3])

    // hour can be any positive integer
    if (m >= 60 || s >= 60) { return false }
    return true
}

/**
 * Converts given GTFS arrival_time/departure_time to number of seconds since noon-12h.
 * You should first check if given time is valid with validTime.
 * @param timeS HH:MM:SS
 */
export function timeToInt (timeS: string): number {
    const [h, m, s] = timeS.split(":").map(i => parseInt(i))
    return h * 3600 + m * 60 + s
}

/**
 * Checks if given route_color/route_text_color is valid and safe to use
 * Returns "#xxxxxx" or null (if the color was invalid)
 * @param value route_color/route_text_color value
 */
export function safeColor (value: string | undefined): string | null {
    if (value === undefined) {
        return null
    } else if (/^[0-9A-Fa-f]{6}$/.test(value)) {
        return "#" + value.toUpperCase()
    } else {
        return null
    }
}
