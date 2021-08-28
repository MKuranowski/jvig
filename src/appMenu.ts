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
/* cspell: disable */

import { app, dialog, Menu } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions, MessageBoxReturnValue, OpenDialogOptions } from 'electron'

const version = app.isPackaged ? app.getVersion() : 'non-packaged version'
const aboutMsg = `
jvig (${version}) - GTFS Viewer application written using Typescript & Electron
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
along with this program.  If not, see https://www.gnu.org/licenses/.
`

function makeAboutOnClick (window?: BrowserWindow): () => Promise<MessageBoxReturnValue> {
  const opts = { type: 'none', buttons: ['Close'], title: 'jvig - About', message: aboutMsg }
  if (window !== undefined) {
    return async () => await dialog.showMessageBox(window, opts)
  } else {
    return async () => await dialog.showMessageBox(opts)
  }
}

function makeOpenFileOnClick (handleOpenFile: (file: string) => Promise<void>, window: BrowserWindow | undefined, folders: boolean): () => Promise<void> {
  const opts: OpenDialogOptions = {
    title: 'jvig - Open GTFS',
    properties: folders ? ['openDirectory'] : ['openFile']
  }

  return async () => {
    const dialogRes = await (window !== undefined ? dialog.showOpenDialog(window, opts) : dialog.showOpenDialog(opts))

    // Only load the file when the dialog was not canceled and when a file was provided
    if (!dialogRes.canceled && dialogRes.filePaths.length !== 0) {
      await handleOpenFile(dialogRes.filePaths[0])
    }
  }
}

export function prepareMenu (handleOpenFile: (file: string) => Promise<void>, window?: BrowserWindow): Menu {
  const templ: MenuItemConstructorOptions[] = [
    {
      label: 'About',
      click: makeAboutOnClick(window)
    },
    {
      label: 'File',
      submenu: [
        {
          label: '&Open',
          accelerator: 'CommandOrControl+O',
          click: makeOpenFileOnClick(handleOpenFile, window, false)
        },
        {
          label: 'Open &Folder',
          accelerator: 'CommandOrControl+Shift+O',
          click: makeOpenFileOnClick(handleOpenFile, window, true)
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'copy' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        { role: 'quit' }
      ]
    }
  ]
  return Menu.buildFromTemplate(templ)
}
