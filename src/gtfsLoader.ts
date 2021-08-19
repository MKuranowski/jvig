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

import { createReadStream } from 'fs'
import { stat, readdir } from 'fs/promises'
import { join as path_join } from 'path'

import { promisify } from 'util'

import { ipcMain } from 'electron'

import * as pEvent from 'p-event'
import * as yauzl from 'yauzl'
import * as csvParse from 'csv-parse'

import { InvalidInputFile, UnableToExtract, NoColumn } from './errs'
import type * as Gtfs from './gtfsTypes'
import { validLat, validLon } from './util'

type MessageSender = (channel: string, ...args: any[]) => void

// Workaround for https://github.com/DefinitelyTyped/DefinitelyTyped/issues/20497
type PYauzlOpen = (arg1: string, arg2?: yauzl.Options) => Promise<yauzl.ZipFile>

const knownFiles: Set<string> = new Set([
  'agency.txt',
  'stops.txt',
  'routes.txt',
  'trips.txt',
  'calendar.txt',
  'calendar_dates.txt',
  'frequencies.txt',
  'stop_times.txt',
  'shapes.txt'
])

/**
 * Processes a GTFS table where a primary key maps to a single Row.
 * @param readStream raw file stream
 * @param tableName name of the table
 * @param primaryKey column name with primary keys
 * @returns loaded table
 */
export async function processToRow (readStream: NodeJS.ReadableStream, tableName: string, primaryKey: string): Promise<Gtfs.FileToRow> {
  const parser = readStream.pipe(csvParse({ bom: true, columns: true }))
  const map: Gtfs.FileToRow = new Map()

  for await (const row of parser) {
    if (row[primaryKey] === undefined) {
      throw new NoColumn(`Table ${tableName} is missing its primary column: ${primaryKey}`)
    }

    map.set(row[primaryKey], row)
  }

  return map
}

/**
 * Processes a GTFS table where a primary key maps to a multiple rows (Row[])
 * @param readStream raw file stream
 * @param tableName name of the table
 * @param primaryKey column name with primary keys
 * @returns loaded table
 */
export async function processToList (readStream: NodeJS.ReadableStream, tableName: string, primaryKey: string): Promise<Gtfs.FileToList> {
  const parser = readStream.pipe(csvParse({ bom: true, columns: true }))
  const map: Gtfs.FileToList = new Map()

  for await (const row of parser) {
    if (row[primaryKey] === undefined) {
      throw new NoColumn(`Table ${tableName} is missing its primary column: ${primaryKey}`)
    }

    const thisTrip = map.get(row[primaryKey])
    if (thisTrip === undefined) {
      map.set(row[primaryKey], [row])
    } else {
      thisTrip.push(row)
    }
  }

  return map
}

/**
 * Special processing function for shapes.txt
 * @param readStream raw file stream
 * @returns loaded table
 */
export async function processShapes (readStream: NodeJS.ReadableStream): Promise<Gtfs.FileShapes> {
  // Start by processing the table normally
  const rowMap = await processToList(readStream, 'shapes.txt', 'shape_id')

  // After the table is loaded - convert every list of rows to a list of points
  const map: Gtfs.FileShapes = new Map()
  rowMap.forEach((rows, key) => {
    rowMap.delete(key)

    const points: Array<[number, number]> = rows
      .sort((a, b) => (parseInt(a.shape_pt_sequence ?? '') - parseInt(b.shape_pt_sequence ?? '')))
      .map(i => [validLat(i.shape_pt_lat) ?? NaN, validLon(i.shape_pt_lon) ?? NaN])

    map.set(key, points)
  })

  return map
}

/**
 * Special post-processing function for stops.txt - build a helper table for easier
 * handling of stop-station structures.
 * @param stopMap loaded stops.txt table
 * @returns map from station ids to their children
 */
export async function postProcessStops (stopMap?: Gtfs.FileToRow): Promise<Gtfs.StopChildren | undefined> {
  if (stopMap === undefined) { return undefined }
  const childrenMap: Gtfs.StopChildren = new Map()

  for (const [stopId, row] of stopMap) {
    // If this is a child-stop with a defined mother - append this child to the mother's list
    if (row.location_type !== '1' && row.parent_station !== '' && row.parent_station !== undefined) {
      const currentChildren = childrenMap.get(row.parent_station)
      if (currentChildren === undefined) {
        childrenMap.set(row.parent_station, [stopId])
      } else {
        currentChildren.push(stopId)
      }
    }
  }

  return childrenMap
}

/**
 * GtfsLoader is an object responsible for loading a GTFS file
 * and sending loading status updates on the go.
 */
export class GtfsLoader {
  sender: MessageSender
  gtfs: Gtfs.Obj = {}
  status: Gtfs.LoadingStatus = {
    status: 'loading',
    fileName: null
  }

  constructor (sender: MessageSender) {
    this.sender = sender
  }

  /**
   * Cleans all acquired resources, for example registered IPC message handlers.
   */
  cleanup (): void {
    ipcMain.removeAllListeners('loading-status-req')
  }

  /**
   * Sends a status update on the loading-status IPC handler.
   */
  sendStatus (): void {
    this.sender('loading-status', this.status)
  }

  /**
   * Tries to create a Gtfs.Obj from a user-provided "file".
   * This "file" can be either a directory, or a path to a zip archive.
   */
  async load (path: string): Promise<Gtfs.Obj> {
    // Reset status and the GTFS object
    this.gtfs = {}
    this.status = {
      status: 'loading',
      fileName: path,
      tables: new Map()
    }
    this.sendStatus()

    // Load data from directory/zip archive
    try {
      const isDir = (await stat(path)).isDirectory()
      await (isDir ? this.loadDirectory(path) : this.loadZip(path))
    } catch (e) {
      this.status.status = 'error'
      this.status.error = e
      this.sendStatus()
      throw e
    }

    // Set 'done' status
    this.status.status = 'done'
    this.sendStatus()

    // Return the GTFS object
    return this.gtfs
  }

  async loadDirectory (path: string): Promise<void> {
    const handleFile = async (filename: string): Promise<void> => {
      // Only operate on known GTFS tables
      if (!knownFiles.has(filename)) { return }
      const stream = createReadStream(path_join(path, filename))
      await this.loadTable(filename, stream)
    }

    // We deliberately create a list of promises, to asynchronously read **all** files
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    await Promise.all((await readdir(path)).map(filename => handleFile(filename)))
  }

  async loadZip (path: string): Promise<void> {
    const loadPromises: Array<Promise<void>> = []
    let zip: yauzl.ZipFile

    // Try to open the provided archive
    try {
      zip = await (promisify(yauzl.open) as PYauzlOpen)(path, { autoClose: true })
    } catch {
      // yauzl throws some really nondescriptive errors, so we re-throw our own one
      throw new InvalidInputFile(
              `Provided file: ${path} doesn't point to ` +
              'a directory or a valid zip archive!')
    }

    // Register handlers for zip files
    const openFileFromArchive = promisify(zip.openReadStream.bind(zip))
    const handleFile = async (entry: yauzl.Entry): Promise<void> => {
      // Only operate on known GTFS tables
      if (!knownFiles.has(entry.fileName)) { return }

      // Get the decompressed stream
      const stream = await openFileFromArchive(entry)
      if (stream === undefined) {
        throw new UnableToExtract(
          `yauzl was unable to read file ${entry.fileName} ` +
          'from within provided archive!')
      }

      // And save the GTFS data from the stream
      await this.loadTable(entry.fileName, stream)
    }
    zip.on('entry', entry => loadPromises.push(handleFile(entry)))

    // Wait for loading to complete
    await pEvent(zip, 'end')
    await Promise.all(loadPromises)
  }

  /**
   * Tries to load a table into this.GtfsObj
   * @param tableName one of knownTables
   * @param stream stream with raw data from the table
   */
  async loadTable (tableName: string, stream: NodeJS.ReadableStream): Promise<void> {
    this.status.tables?.set(tableName, 'loading')
    this.sendStatus()

    switch (tableName) {
      case 'agency.txt':
        this.gtfs.agency = await processToRow(stream, tableName, 'agency_id')
        break
      case 'stops.txt':
        this.gtfs.stops = await processToRow(stream, tableName, 'stop_id')
        this.gtfs._stopChildren = await postProcessStops(this.gtfs.stops)
        break
      case 'routes.txt':
        this.gtfs.routes = await processToRow(stream, tableName, 'route_id')
        break
      case 'trips.txt':
        this.gtfs.trips = await processToRow(stream, tableName, 'trip_id')
        break
      case 'calendar.txt':
        this.gtfs.calendar = await processToRow(stream, tableName, 'service_id')
        break
      case 'calendar_dates.txt':
        this.gtfs.calendarDates = await processToList(stream, tableName, 'service_id')
        break
      case 'frequencies.txt':
        this.gtfs.frequencies = await processToList(stream, tableName, 'trip_id')
        break
      case 'stop_times.txt':
        this.gtfs.stopTimes = await processToList(stream, tableName, 'trip_id')
        break
      case 'shapes.txt':
        this.gtfs.shapes = await processShapes(stream)
        break
    }

    this.status.tables?.set(tableName, 'done')
    this.sendStatus()
  }
}
