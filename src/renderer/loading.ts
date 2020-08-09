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

import { ipcRenderer } from "electron"
import type { IpcRendererEvent } from "electron"

import { NoContentInHtml } from "../errs"
import type { LoadingStatus } from "../gtfs"

async function onNewStatus (event: IpcRendererEvent, newStatus: LoadingStatus): Promise<void> {
    const content = document.getElementById("content") as (HTMLDivElement | null)

    // Check if content exists
    if (content === null) {
        throw new NoContentInHtml("this document has no element with id=content")
    }

    switch (newStatus.status) {
    case "nofile": {
        const h3 = document.createElement("h3")
        h3.className = "value-error"

        if (newStatus.fileName === null) {
            h3.append("Error! No file was provided to jvig.")
        } else {
            h3.append(`Error! File '${newStatus.fileName}' does not exist.`)
        }

        content.innerHTML = ""
        content.append(h3)

        break
    }

    case "error": {
        const h3 = document.createElement("h3")
        h3.className = "value-error"
        h3.append("An error occured when loading GTFS data!")

        content.append(h3)

        // Add a stack trace
        if (newStatus.error) {
            const pre = document.createElement("pre")
            pre.append(newStatus.error.stack || newStatus.error.toString())
            content.append(pre)
        }

        break
    }

    case "loading": {
        let table = document.getElementById("loading-status") as (HTMLTableElement | null)

        // No table exist
        if (table === null) {
            const h3 = document.createElement("h3")
            h3.append(`Loading file '${newStatus.fileName}'`)

            table = document.createElement("table")
            table.id = "loading-status"

            const headerRow = document.createElement("tr")
            const header1 = document.createElement("th")
            const header2 = document.createElement("th")

            header1.append("Table Name")
            header2.append("Status")
            headerRow.append(header1, header2)
            table.append(headerRow)

            content.append(h3, table)
        }

        if (newStatus.tables === undefined) {
            return
        }

        for (const [gtfsTable, currentState] of newStatus.tables) {
            let row = document.getElementById(`status-${gtfsTable}`)

            if (row === null) {
                row = document.createElement("tr")
                row.id = `status-${gtfsTable}`

                const nameCell = document.createElement("td")
                nameCell.textContent = gtfsTable

                const stateCell = document.createElement("td")
                stateCell.textContent = currentState

                row.append(nameCell, stateCell)

                table.append(row)
            } else {
                row.childNodes[row.childNodes.length - 1].textContent = currentState
            }
        }

        break
    }

    case "done": {
        ipcRenderer.removeAllListeners("loading-status")
        content.textContent = "Loading finished, redirecting soon..."
        break
    }
    }
}

export async function init (): Promise<void> {
    ipcRenderer.on("loading-status", onNewStatus)
    await ipcRenderer.invoke("loading-status-req")
}
