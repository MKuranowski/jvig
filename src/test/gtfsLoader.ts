/*
jvig - GTFS Viewer application written using Typescript & Electron
Copyright © 2021 Mikołaj Kuranowski

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

import test from 'ava'
import { Readable } from 'stream'
import { join as path_join } from 'path'

import * as Gtfs from '../gtfsTypes'
import * as loader from '../gtfsLoader'
import { NoColumn } from '../errs'
import { createReadStream } from 'fs'

function fixturePath (...parts: string[]): string {
  return path_join(__dirname, 'fixture', ...parts)
}

test('processToRow()', async t => {
  const csv = Readable.from(
    'id,code,name,type\r\n' +
    '1,M1,Kabaty - Młociny,METRO\r\n' +
    '2,M2,Księcia Janusza - Trocka,METRO\r\n'
  )

  const data = await loader.processToRow(csv, '<inline>', 'id')

  t.is(data.size, 2)
  t.deepEqual(
    data.get('1'),
    {
      id: '1',
      code: 'M1',
      name: 'Kabaty - Młociny',
      type: 'METRO'
    }
  )
  t.deepEqual(
    data.get('2'),
    {
      id: '2',
      code: 'M2',
      name: 'Księcia Janusza - Trocka',
      type: 'METRO'
    }
  )
})

test('processToRow() throws NoColumn', async t => {
  const csv = Readable.from(
    'id,code,name,type\r\n' +
    '1,M1,Kabaty - Młociny,METRO\r\n' +
    '2,M2,Księcia Janusza - Trocka,METRO\r\n'
  )

  await t.throwsAsync(
    loader.processToRow(csv, '<inline>', 'missing_column'),
    { instanceOf: NoColumn, message: 'Table <inline> is missing its primary column: missing_column' }
  )
})

test('processToList()', async t => {
  const csv = Readable.from(
    'trip,stop,time\r\n' +
    '1,A,10:00:00\r\n' +
    '1,B,10:05:00\r\n' +
    '1,C,10:10:00\r\n' +
    '2,C,10:30:00\r\n' +
    '2,A,10:36:30\r\n'
  )

  const data = await loader.processToList(csv, '<inline>', 'trip')

  t.is(data.size, 2)
  t.deepEqual(
    data.get('1'),
    [
      { trip: '1', stop: 'A', time: '10:00:00' },
      { trip: '1', stop: 'B', time: '10:05:00' },
      { trip: '1', stop: 'C', time: '10:10:00' }
    ]
  )
  t.deepEqual(
    data.get('2'),
    [
      { trip: '2', stop: 'C', time: '10:30:00' },
      { trip: '2', stop: 'A', time: '10:36:30' }
    ]
  )
})

test('processToList() throws NoColumn', async t => {
  const csv = Readable.from(
    'trip,stop,time\r\n' +
    '1,A,10:00:00\r\n' +
    '1,B,10:05:00\r\n' +
    '1,C,10:10:00\r\n' +
    '2,C,10:30:00\r\n' +
    '2,A,10:36:30\r\n'
  )

  await t.throwsAsync(
    loader.processToList(csv, '<inline>', 'missing_column'),
    { instanceOf: NoColumn, message: 'Table <inline> is missing its primary column: missing_column' }
  )
})

test('processShapes()', async t => {
  const csv = Readable.from(
    'shape_id,shape_pt_sequence,shape_pt_lat,shape_pt_lon\r\n' +
    'a,1,11.0,11.0\r\n' +
    'a,2,13.0,9.0\r\n' +
    'a,3,15.0,7.0\r\n' +
    'b,1,7.0,-15\r\n' +
    'b,2,9.12,-17.12\r\n'
  )

  const data = await loader.processShapes(csv)

  t.is(data.size, 2)
  t.deepEqual(
    data.get('a'),
    [[11, 11], [13, 9], [15, 7]]
  )
  t.deepEqual(
    data.get('b'),
    [[7, -15], [9.12, -17.12]]
  )
})

test('processShapes() throws NoColumn', async t => {
  const csv = Readable.from(
    'id,shape_pt_sequence,shape_pt_lat,shape_pt_lon\r\n' +
    'a,1,11.0,11.0\r\n' +
    'a,2,13.0,9.0\r\n' +
    'a,3,15.0,7.0\r\n' +
    'b,1,7.0,-15\r\n' +
    'b,2,9.12,-17.12\r\n'
  )

  await t.throwsAsync(
    loader.processShapes(csv),
    { instanceOf: NoColumn, message: 'Table shapes.txt is missing its primary column: shape_id' }
  )
})

test('processShapes() replaces invalid with NaN', async t => {
  const csv = Readable.from(
    'shape_id,shape_pt_sequence,shape_pt_lat,shape_pt_lon\r\n' +
    'a,1,,\r\n' +
    'a,2,null,null\r\n' +
    'a,3,120,-420\r\n'
  )

  const data = await loader.processShapes(csv)

  t.deepEqual(
    data.get('a'),
    [[NaN, NaN], [NaN, NaN], [NaN, NaN]]
  )
})

test('processShapes() sorts by shape_pt_sequence', async t => {
  const csv = Readable.from(
    'shape_id,shape_pt_sequence,shape_pt_lat,shape_pt_lon\r\n' +
    'b,2,7.0,-15\r\n' +
    'b,1,9.12,-17.12\r\n'
  )

  const data = await loader.processShapes(csv)

  t.deepEqual(
    data.get('b'),
    [[9.12, -17.12], [7, -15]]
  )
})

test('postProcessStops()', async t => {
  // @ts-expect-error
  const stops: Gtfs.FileToRow = new Map([
    ['1', { stop_id: '1', location_type: '', parent_station: '' }],
    ['2', { stop_id: '2' }],
    ['sta1', { stop_id: 'sta1', location_type: '1', parent_station: '' }],
    ['sta1-a', { stop_id: 'sta1-a', location_type: '0', parent_station: 'sta1' }],
    ['sta1-b', { stop_id: 'sta1-b', location_type: '0', parent_station: 'sta1' }],
    ['sta2', { stop_id: 'sta1', location_type: '1', parent_station: '' }],
    ['sta2-a', { stop_id: 'sta2-a', location_type: '0', parent_station: 'sta2' }],
    ['sta2-b', { stop_id: 'sta2-b', location_type: '2', parent_station: 'sta2' }]
  ])

  const children = await loader.postProcessStops(stops)

  t.is(children?.size, 2)
  t.deepEqual(children?.get('sta1'), ['sta1-a', 'sta1-b'])
  t.deepEqual(children?.get('sta2'), ['sta2-a', 'sta2-b'])
})

test('postProcessStops() does nothing on empty input', async t => {
  t.is(await loader.postProcessStops(undefined), undefined)
})

test('GtfsLoader.loadTable()', async t => {
  // Check message sending
  let msgCount: number = 0
  function sendMessage (channel: string, ...args: any[]): void {
    t.is(channel, 'loading-status')
    t.is(args.length, 1)
    const update: Gtfs.LoadingStatus = args[0]

    switch (msgCount++) {
      case 0:
        t.is(update.tables?.get('agency.txt'), 'loading')
        break
      case 1:
        t.is(update.tables?.get('agency.txt'), 'done')
        break
      default:
        t.fail('too many status updates')
    }
  }

  // Check table loading
  const o: loader.GtfsLoader = new loader.GtfsLoader(sendMessage)
  o.status.tables = new Map()
  const stream = createReadStream(fixturePath('gtfs', 'agency.txt'))
  await o.loadTable('agency.txt', stream)

  t.is(o.gtfs.agency?.size, 2)
  t.deepEqual(
    o.gtfs.agency?.get('1'),
    {
      agency_id: '1',
      agency_name: 'Example Busses',
      agency_timezone: 'Etc/UTC',
      agency_url: 'https://example.com'
    }
  )
  t.deepEqual(
    o.gtfs.agency?.get('2'),
    {
      agency_id: '2',
      agency_name: 'Example Trams',
      agency_timezone: 'Etc/UTC',
      agency_url: 'https://example.com'
    }
  )
  t.is(msgCount, 2, 'too few status updates')
})

test('GtfsLoader.loadZip()', async t => {
  t.plan(10) // 6 calls to sendMessage + 4 assertions for table sizes
  function sendMessage (channel: string, ...args: any[]): void {
    t.is(channel, 'loading-status')
  }

  const o: loader.GtfsLoader = new loader.GtfsLoader(sendMessage)
  o.status.tables = new Map()
  await o.loadZip(fixturePath('gtfs.zip'))

  t.is(o.status.tables.size, 3)
  t.is(o.gtfs.agency?.size, 2)
  t.is(o.gtfs.calendar?.size, 2)
  t.is(o.gtfs.routes?.size, 4)
})

test('GtfsLoader.loadDirectory()', async t => {
  t.plan(10) // 6 calls to sendMessage + 4 assertions for table sizes
  function sendMessage (channel: string, ...args: any[]): void {
    t.is(channel, 'loading-status')
  }

  const o: loader.GtfsLoader = new loader.GtfsLoader(sendMessage)
  o.status.tables = new Map()
  await o.loadDirectory(fixturePath('gtfs'))

  t.is(o.status.tables.size, 3)
  t.is(o.gtfs.agency?.size, 2)
  t.is(o.gtfs.calendar?.size, 2)
  t.is(o.gtfs.routes?.size, 4)
})

test('GtfsLoader.load() on invalid files', async t => {
  // Check communications
  let msgCount: number = 0
  function sendMessage (channel: string, ...args: any[]): void {
    t.is(channel, 'loading-status')
    t.is(args.length, 1)
    const update: Gtfs.LoadingStatus = args[0]

    switch (msgCount++) {
      case 0:
        t.is(update.status, 'loading')
        break
      case 1:
        t.is(update.status, 'error')
        t.assert(update.error !== undefined)
        break
      default:
        t.fail('too many status updates')
    }
  }

  const o: loader.GtfsLoader = new loader.GtfsLoader(sendMessage)

  await t.throwsAsync(
    o.load(fixturePath('invalid.zip')),
    { instanceOf: Error, code: 'ENOENT', message: /no such file/i }
  )

  t.is(msgCount, 2, 'too few status updates')
})

test('GtfsLoader.load() on zip files', async t => {
  // Check communications
  let msgCount: number = 0
  function sendMessage (channel: string, ...args: any[]): void {
    t.is(channel, 'loading-status')
    t.is(args.length, 1)
    const update: Gtfs.LoadingStatus = args[0]

    if (msgCount === 0) {
      t.is(update.status, 'loading')
    } else if (msgCount === 7) {
      t.is(update.status, 'done')
    } else if (msgCount > 7) {
      t.fail('too many status updates')
    }

    ++msgCount
  }

  // Test loading
  const gtfs = await new loader.GtfsLoader(sendMessage).load(fixturePath('gtfs.zip'))
  t.is(gtfs.agency?.size, 2)
  t.is(gtfs.routes?.size, 4)
  t.is(gtfs.calendar?.size, 2)
  t.is(gtfs.calendarDates, undefined)
  t.is(msgCount, 8, 'too few status updates')
})

test('GtfsLoader.load() on directories files', async t => {
  // Check communications
  let msgCount: number = 0
  function sendMessage (channel: string, ...args: any[]): void {
    t.is(channel, 'loading-status')
    t.is(args.length, 1)
    const update: Gtfs.LoadingStatus = args[0]

    if (msgCount === 0) {
      t.is(update.status, 'loading')
    } else if (msgCount === 7) {
      t.is(update.status, 'done')
    } else if (msgCount > 7) {
      t.fail('too many status updates')
    }

    ++msgCount
  }

  // Test loading
  const gtfs = await new loader.GtfsLoader(sendMessage).load(fixturePath('gtfs'))
  t.is(gtfs.agency?.size, 2)
  t.is(gtfs.routes?.size, 4)
  t.is(gtfs.calendar?.size, 2)
  t.is(gtfs.calendarDates, undefined)
  t.is(msgCount, 8, 'too few status updates')
})
