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

import * as fs from "fs"

import { join } from "path"
import { promisify } from "util"

import * as pEvent from "p-event"
import * as yauzl from "yauzl"
import * as csvParse from "csv-parse"

import { InvalidInputFile, UnableToExtract, NoPrimaryColumn } from "./errs"
import type * as Gtfs from "./gtfsTypes"

import { ipcMain } from "electron"
import type { BrowserWindow } from "electron"

// Workaround for https://github.com/DefinitelyTyped/DefinitelyTyped/issues/20497
type PYauzlOpen = (arg1: string, arg2?: yauzl.Options) => Promise<yauzl.ZipFile>

type LoadingStatusStates = "nofile" | "error" | "loading" | "done"
type LoadingStatusTableState = "error" | "loading" | "done"

export interface LoadingStatus {
    status: LoadingStatusStates,
    fileName: string | null,
    tables?: Map<string, LoadingStatusTableState>,
    error?: Error
}

// Function creating Gtfs.File* from readable streams
async function processToRow (readStream: NodeJS.ReadableStream, tableName: string, primaryKey: string): Promise<Gtfs.FileToRow> {
    const parser = readStream.pipe(csvParse({ bom: true, columns: true }))
    const map: Gtfs.FileToRow = new Map()

    for await (const row of parser) {
        if (row[primaryKey] === undefined) {
            throw new NoPrimaryColumn(`Table ${tableName} is missing its primary column: ${primaryKey}`)
        }

        map.set(row[primaryKey], row)
    }

    return map
}

async function processToList (readStream: NodeJS.ReadableStream, tableName: string, primaryKey: string): Promise<Gtfs.FileToList> {
    const parser = readStream.pipe(csvParse({ bom: true, columns: true }))
    const map: Gtfs.FileToList = new Map()

    for await (const row of parser) {
        if (row[primaryKey] === undefined) {
            throw new NoPrimaryColumn(`Table ${tableName} is missing its primary column: ${primaryKey}`)
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

async function processShapes (readStream: NodeJS.ReadableStream, tableName: string, primaryKey: string): Promise<Gtfs.FileShapes> {
    const parser = readStream.pipe(csvParse({ bom: true, columns: true }))
    const rowmap: Gtfs.FileToList = new Map()
    const map: Gtfs.FileShapes = new Map()

    for await (const row of parser) {
        if (row.shape_id === undefined) {
            throw new NoPrimaryColumn(`Table ${tableName} is missing its primary column: ${primaryKey}`)
        }

        const thisTrip = rowmap.get(row.shape_id)
        if (thisTrip === undefined) {
            rowmap.set(row.shape_id, [row])
        } else {
            thisTrip.push(row)
        }
    }

    rowmap.forEach(async (rows, key) => {
        rowmap.delete(key)

        const points: [number, number][] = rows
            .sort((a, b) => (parseInt(a.shape_pt_sequence) - parseInt(b.shape_pt_sequence)))
            .map(i => [parseFloat(i.shape_pt_lat), parseFloat(i.shape_pt_lon)])

        map.set(key, points)
    })

    return map
}

async function postProcessStops (stopMap: Gtfs.FileToRow | undefined): Promise<Gtfs.StopChildren | undefined> {
    if (stopMap === undefined) { return undefined }
    const childrenMap: Gtfs.StopChildren = new Map()

    for (const [stopId, row] of stopMap) {
        if (row.location_type !== "1" && row.parent_station) {
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

// Instructions how to handle GTFS file
type Processor<T> = (readStream: NodeJS.ReadableStream, tableName: string, primaryKey: string) => Promise<T>
type FileHandlerDef<T extends keyof Gtfs.Obj> = [T, Processor<Gtfs.Obj[T]>, string]

// file_name → tableName, processingFunction, primaryKey
const fileHandlers: Map<string, FileHandlerDef<keyof Gtfs.Obj>> = new Map([
    ["agency.txt", ["agency", processToRow, "agency_id"]],
    ["stops.txt", ["stops", processToRow, "stop_id"]],
    ["routes.txt", ["routes", processToRow, "route_id"]],
    ["trips.txt", ["trips", processToRow, "trip_id"]],
    ["calendar.txt", ["calendar", processToRow, "service_id"]],
    ["calendar_dates.txt", ["calendarDates", processToList, "service_id"]],
    ["frequencies.txt", ["frequencies", processToList, "trip_id"]],
    ["stop_times.txt", ["stopTimes", processToList, "trip_id"]],
    ["shapes.txt", ["shapes", processShapes, "shape_id"]]
])

// Current state of loading the GTFS
class StatusUpdater {
    window: BrowserWindow
    status: LoadingStatus

    constructor (mainWindow: BrowserWindow) {
        this.window = mainWindow
        this.status = {
            status: "loading",
            fileName: null
        }
    }

    async send () {
        this.window.webContents.send("loading-status", this.status)
    }

    setNoFile () {
        this.status.status = "nofile"
    }

    setError (e: Error) {
        this.status.status = "error"
        delete this.status.tables
        this.status.error = e

        this.send()
    }

    setTableState (table: string, newStatus: LoadingStatusTableState) {
        if (this.status.tables === undefined) { this.status.tables = new Map() }
        this.status.tables.set(table, newStatus)

        this.send()
    }

    setDone () {
        this.status.status = "done"
        delete this.status.tables
        this.send()
    }
}

var statusUpdater: StatusUpdater

// Function that process specific input types
async function handleDirectory (directoryPath: string): Promise<Gtfs.Obj> {
    const entryPromises: Promise<void>[] = []
    const gtfsobj: Gtfs.Obj = {}

    const handleEntry = async (filename: string) => {
        // Get information what to do with this entry
        const thisFileHandlers = fileHandlers.get(filename)

        if (thisFileHandlers === undefined) { return }
        const [table, processor, primaryKey] = thisFileHandlers

        // Mark this table as loaded
        statusUpdater.setTableState(table, "loading")

        const reader = fs.createReadStream(join(directoryPath, filename))

        // @ts-ignore | no fucking clue
        gtfsobj[table] = await processor(reader, table, primaryKey)
        if (table === "stops") { gtfsobj._stopChildren = await postProcessStops(gtfsobj.stops) }

        // Mark this table as loaded
        statusUpdater.setTableState(table, "done")
    }

    fs.readdirSync(directoryPath).forEach(async filename => entryPromises.push(handleEntry(filename)))

    await Promise.all(entryPromises)
    statusUpdater.setDone()

    return gtfsobj
}

async function handleZip (zipPath: string): Promise<Gtfs.Obj> {
    const entryPromises: Promise<void>[] = []
    const gtfsobj: Gtfs.Obj = {}
    let zip: yauzl.ZipFile | undefined

    try {
        zip = await (promisify(yauzl.open) as PYauzlOpen)(zipPath, { autoClose: true })
    } catch {
        // yauzl throws some really undescriptive errors, so we re-throw our own one
        throw new InvalidInputFile(
            `Provided file: ${zipPath} doesn't point to ` +
            "a directory or a valid zip archive!")
    }

    if (zip === undefined) {
        throw new UnableToExtract(`yauzl was unable to read ZIP file ${zipPath}`)
    }

    const openReadStream = promisify(zip.openReadStream.bind(zip))
    const handleEntry = async (entry: yauzl.Entry) => {
        const thisFileHandler = fileHandlers.get(entry.fileName)

        if (thisFileHandler === undefined) { return }
        const [table, processor, primaryKey] = thisFileHandler
        const reader = await openReadStream(entry)

        statusUpdater.setTableState(table, "loading")

        // Check if the input stream was succesfully created
        if (reader === undefined) {
            throw new UnableToExtract(
                `yauzl was unable to read file ${entry.fileName} ` +
                "from within provided archive!")
        }

        // @ts-ignore | no fucking clue
        gtfsobj[table] = await processor(reader, table, primaryKey)
        if (table === "stops") { gtfsobj._stopChildren = await postProcessStops(gtfsobj.stops) }

        statusUpdater.setTableState(table, "done")
    }

    zip.on("entry", async entry => {
        entryPromises.push(handleEntry(entry))
    })

    // Wait until all actions have finished
    await pEvent(zip, "end")
    await Promise.all(entryPromises)
    statusUpdater.setDone()

    return gtfsobj
}

/**
 * Tries to load whatever the user provided as "GTFS".
 * Returns a path to a temporary directory with only GTFS files.
 *
 * If provided path points to a directory, creates COW links in the returned tempdir.
 * If provided with path to a zip file, extracts files into the returned tempdir.
 * Else throws an error with message "Input is not GTFS"
 */
export async function handleInput (inputPath: string | undefined, mainWin: BrowserWindow): Promise<Gtfs.Obj> {
    statusUpdater = new StatusUpdater(mainWin)

    ipcMain.handle("loading-status-req", event => statusUpdater.send())

    if (inputPath === undefined) {
        statusUpdater.setNoFile()
        throw new InvalidInputFile("No input file provided!")
    } else if (!fs.existsSync(inputPath)) {
        statusUpdater.status.fileName = inputPath
        statusUpdater.setNoFile()
        throw new InvalidInputFile("Input file does not exist!")
    }

    statusUpdater.status.fileName = inputPath
    let gtfsObj: Gtfs.Obj

    try {
        const inputStat = await promisify(fs.stat)(inputPath)

        if (inputStat.isDirectory()) {
            gtfsObj = await handleDirectory(inputPath)
        } else {
            gtfsObj = await handleZip(inputPath)
        }
    } catch (e) {
        statusUpdater.setError(e)
        throw e
    }

    ipcMain.removeHandler("loading-status-req")
    return gtfsObj
}
