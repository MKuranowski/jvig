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

import { app, Menu, BrowserWindow, ipcMain } from "electron"
import type { IpcMainInvokeEvent } from "electron"
import { join } from "path"

import { handleInput } from "./gtfs"
import { InvalidInputFile } from "./errs"
import type * as Gtfs from "./gtfsTypes"

// Crash on unhandled promise rejeections
process.on("unhandledRejection", e => { throw e })

var mainGtfsObj: Gtfs.Obj
var mainWindow: BrowserWindow

async function createWindow () {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        icon: join(__dirname, "..", "icon", "jvig.png"),
        webPreferences: {
            nodeIntegration: true
        }
    })

    Menu.setApplicationMenu(null)

    mainWindow.loadFile(join(__dirname, "..", "www", "loading.html"))
    console.log(process.argv)
    if (process.argv.includes("devTools")) { mainWindow.webContents.openDevTools() }
}

async function createGtfs () {
    const inFile = app.isPackaged ? process.argv[1] : process.argv[2]

    if (inFile === undefined) {
        throw new InvalidInputFile("Path to a GTFS file/folder is expected in program arguments!")
    }

    mainGtfsObj = await handleInput(inFile)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
    await Promise.all([createWindow(), createGtfs()])

    mainWindow.loadFile(join(__dirname, "..", "www", "agency.html"))

    app.on("activate", function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) { createWindow() }
    })
})

// Quit when all windows are closed.
app.on("window-all-closed", function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") { app.quit() }
})

/* List of ipc channels:
 * "dump-request", arg: (tableName - shapes)
 *     returns: --
 *     side effect: starts dumping data on "dump-stream" channel
 *
 * "dump-stream"
 *     ! main → renderer !
 *     returns: Gtfs.Row
 *
 * "exists", args: [table]
 *     returns: boolean
 *
 * "find", args: [table, primaryValue]
 *     returns: null | Gtfs.PossibleValues
 *
 */

ipcMain.handle(
    "exists",
    function (event: IpcMainInvokeEvent, ...args: [keyof Gtfs.Obj]): boolean {
        const tableName = args[0]
        return mainGtfsObj[tableName] !== undefined
    }
)

ipcMain.handle(
    "dump-request",
    function (event: IpcMainInvokeEvent, ...args: [Exclude<keyof Gtfs.Obj, "shapes">]): "done" {
        const tableName = args[0]
        const tableMap = mainGtfsObj[tableName]
        if (tableMap === undefined) { return "done" }

        for (const [, value] of tableMap) {
            mainWindow.webContents.send("dump-stream", value)
        }

        return "done"
    }
)

ipcMain.handle(
    "find",
    function (event: IpcMainInvokeEvent, ...args: [keyof Gtfs.Obj, string]): null | Gtfs.PossibleValues {
        const [tableName, primaryValue] = args
        return mainGtfsObj[tableName]?.get(primaryValue) || null
    }
)
