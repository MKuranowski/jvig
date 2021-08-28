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
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { join as path_join } from 'path'

import { GtfsLoader } from './gtfsLoader'
import { prepareMenu } from './appMenu'
import type * as Gtfs from './gtfsTypes'

// Crash on unhandled promise rejections
process.on('unhandledRejection', (e: Error) => { throw e })

// Class representing the application
class JvigApp {
  loader: GtfsLoader | undefined
  gtfs: Gtfs.Obj | undefined
  window: BrowserWindow | undefined

  /**
   * Handler when Electron becomes ready.
   * Only then can we create windows, all APIs are populated and all that kind of jazz.
   */
  async onReady (): Promise<void> {
    Menu.setApplicationMenu(
      prepareMenu(async (f: string) => await this.handleOpenFile(null, f), this.window)
    )
    await this.makeWindow()
    const hasFile = await this.loadGtfs()
    if (hasFile) {
      await this.window!.loadFile(path_join(__dirname, '..', 'www', 'agency.html'))
    }
    // app.on('activate', async function () {
    //   // On macOS it's common to re-create a window in the app when the
    //   // dock icon is clicked and there are no other windows open.
    //   if (BrowserWindow.getAllWindows().length === 0) { await createWindow() }
    // })
  }

  /**
   * Short handler to close Jvig when all windows are closed
   */
  onWindowAllClosed (): void {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    // if (process.platform !== 'darwin') { app.quit() }
    app.quit()
  }

  /**
   * Creates a new Window and opens it on the loading or agency page
   */
  async makeWindow (): Promise<void> {
    this.window = new BrowserWindow({
      width: 1280,
      height: 720,
      icon: path_join(__dirname, '..', 'icon', 'jvig.png'),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    })

    const pageToOpen = this.gtfs === undefined ? 'loading.html' : 'agency.html'
    await this.window.loadFile(path_join(__dirname, '..', 'www', pageToOpen))
    if (process.argv.includes('devTools')) { this.window.webContents.openDevTools() }
  }

  /**
   * Tries to load a GTFS file from provided arguments
   */
  async loadGtfs (inFile?: string): Promise<boolean> {
    // If no file is provided via arguments try to get the filename from CLI arguments
    inFile ??= app.isPackaged ? process.argv[1] : process.argv[2]

    if (inFile === undefined) {
      // FIXME: This seems racey, what if the renderer is displaying a different page?
      // we should probably keep the loader instance running to respond properly to load-status-req
      this.window?.webContents.send('loading-status', {
        status: 'nofile',
        fileName: null
      })
      return false
    }

    // eslint-disable-next-line
    this.loader = new GtfsLoader(this.window!.webContents.send.bind(this.window!.webContents))
    try {
      this.gtfs = await this.loader.load(inFile)
    } finally {
      this.loader.cleanup()
      this.loader = undefined
    }
    return true
  }

  // ------ IPC ------ //
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
   *     ! only when a GTFS is loaded !
   *     returns: --
   *     side-effect: force a loading-status message
   *
   * "open-file", args: [filePath]
   *     returns: --
   *     side-effect: navigates to loading.html and causes a GTFS reload
   */

  handleExists (_event: IpcMainInvokeEvent, tableName: keyof Gtfs.Obj): boolean {
    return this.gtfs?.[tableName] !== undefined
  }

  handleDumpRequest (_event: IpcMainInvokeEvent, tableName: Exclude<keyof Gtfs.Obj, 'shapes'>): 'done' {
    const tableMap = this.gtfs?.[tableName]
    const dumpChannel = 'dump-stream-' + tableName

    if (tableMap === undefined) { return 'done' }

    for (const [, value] of tableMap) {
      this.window!.webContents.send(dumpChannel, value)
    }

    return 'done'
  }

  handleFind (_event: IpcMainInvokeEvent, tableName: keyof Gtfs.Obj, primaryValue: string): null | Gtfs.PossibleValues {
    return this.gtfs?.[tableName]?.get(primaryValue) ?? null
  }

  handleLoadingStatusReq (_event: IpcMainInvokeEvent): void {
    if (this.loader !== undefined) this.loader.sendStatus()
  }

  async handleOpenFile (_event: IpcMainInvokeEvent | null, file: string): Promise<void> {
    this.gtfs = undefined
    await this.window!.loadFile(path_join(__dirname, '..', 'www', 'loading.html'))
    const success = await this.loadGtfs(file)
    if (success) {
      await this.window!.loadFile(path_join(__dirname, '..', 'www', 'agency.html'))
    }
  }
}

// Create an instance of Jvig and register all handlers
var jvig = new JvigApp()
// eslint-disable-next-line @typescript-eslint/no-floating-promises
app.isReady() ? jvig.onReady() : app.on('ready', jvig.onReady.bind(jvig))
app.on('window-all-closed', jvig.onWindowAllClosed.bind(jvig))
ipcMain.handle('loading-status-req', jvig.handleLoadingStatusReq.bind(jvig))
ipcMain.handle('exists', jvig.handleExists.bind(jvig))
ipcMain.handle('dump-request', jvig.handleDumpRequest.bind(jvig))
ipcMain.handle('find', jvig.handleFind.bind(jvig))
ipcMain.handle('open-file', jvig.handleOpenFile.bind(jvig))
