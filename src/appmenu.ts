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

import { app, dialog } from "electron"

const version = app.getVersion() + (app.isPackaged ? "" : " live")
const aboutMsg = `
jvig (${version}) - GTFS Viewer application written using Typescript & Electron
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
along with this program.  If not, see https://www.gnu.org/licenses/.
`

export const menuTempl = [
    {
        label: "About",
        click: async () => dialog.showMessageBox({
            type: "none", buttons: ["Close"], title: "jvig - About", message: aboutMsg
        })
    },
    {
        label: "Edit",
        submenu: [
            { role: "copy" },
            { role: "selectall" }
        ]
    },
    {
        label: "View",
        submenu: [
            { role: "reload" },
            { role: "forcereload" },
            { type: "separator" },
            { role: "resetzoom" },
            { role: "zoomin" },
            { role: "zoomout" },
            { type: "separator" },
            { role: "togglefullscreen" }
        ]
    },
    { role: "windowMenu" }
]
