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

type MapValue<T> = T extends Map<any, infer V> ? V : never

export type Row = Record<string, string>

export type FileToRow = Map<string, Row>
export type FileToList = Map<string, Row[]>
export type FileShapes = Map<string, Array<[number, number]>>
export type StopChildren = Map<string, string[]>

export interface Obj {
  agency?: FileToRow
  stops?: FileToRow
  _stopChildren?: StopChildren
  routes?: FileToRow
  trips?: FileToRow
  calendar?: FileToRow
  calendarDates?: FileToList
  frequencies?: FileToList
  stopTimes?: FileToList
  shapes?: FileShapes
}

export type PossibleValues = MapValue<Obj[keyof Obj]>

type LoadingStatusStates = 'nofile' | 'error' | 'loading' | 'done'
type LoadingStatusTableState = 'error' | 'loading' | 'done'

export interface LoadingStatus {
  status: LoadingStatusStates
  fileName: string | null
  tables?: Map<string, LoadingStatusTableState>
  error?: Error
}
