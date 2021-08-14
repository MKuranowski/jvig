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

/* global init:readonly */
const { shell } = require('electron')

document.addEventListener('click', event => {
  if (event.target === null) { return }
  const target = event.target

  if (target.tagName.toLowerCase() === 'a' && target.href.match(/^https?:\/\/.*$/)) {
    event.preventDefault()
    shell.openExternal(target.href)
  }
}, false)

document.onreadystatechange = async function () {
  if (document.readyState === 'interactive') {
    await init()
  }
}
