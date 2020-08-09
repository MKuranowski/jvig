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

import { app, BrowserWindow, Menu, ipcMain } from "electron"
import type { IpcMainInvokeEvent } from "electron"
import { join } from "path"

import { handleInput } from "./gtfs"
import { menuTempl } from "./appmenu"
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

    mainWindow.loadFile(join(__dirname, "..", "www", "loading.html"))
    if (process.argv.includes("devTools")) { mainWindow.webContents.openDevTools() }
}

async function createGtfs () {
    const inFile = app.isPackaged ? process.argv[1] : process.argv[2]

    mainGtfsObj = await handleInput(inFile, mainWindow)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
    // @ts-ignore
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTempl))

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
 *     side effect: starts dumping data on `dump-stream-${tableName}` channel
 *
 * `dump-stream-${tableName}`
 *     ! main → renderer !
 *     returns: Gtfs.Row
 *
 * "exists", args: [table]
 *     returns: boolean
 *
 * "find", args: [table, primaryValue]
 *     returns: null | Gtfs.PossibleValues
 *
 * "loading-status"
 *     ! main → renderer !
 *     ! only when a GTFS is loaded !
 *     returns: status object
 *
 * "loading-status-req"
 *     ! only when a GTFS is loaded
 *     returns: --
 *     side-effect: force a loading-status message
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
        const dumpChannel = "dump-stream-" + tableName

        if (tableMap === undefined) { return "done" }

        for (const [, value] of tableMap) {
            mainWindow.webContents.send(dumpChannel, value)
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
