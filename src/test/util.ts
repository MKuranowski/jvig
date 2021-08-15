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
import * as util from '../util'

test('util.validLat()', t => {
  t.is(util.validLat(undefined), null, 'missing argument')
  t.is(util.validLat('52.12'), 52.12, 'positive decimal input')
  t.is(util.validLat('-42.86'), -42.86, 'negative decimal input')
  t.is(util.validLat('120.86'), null, 'positive decimal overflow')
  t.is(util.validLat('-420.11'), null, 'negative decimal overflow')
  t.is(util.validLat('52'), 52, 'positive integer input')
  t.is(util.validLat('-42'), -42, 'negative integer input')
  t.is(util.validLat('120'), null, 'positive integer overflow')
  t.is(util.validLat('-420'), null, 'negative integer overflow')
  t.is(util.validLat('foo'), null, 'non-numeric input')
  t.is(util.validLat('41,100'), null, 'number with comma')
})

test('util.validLon()', t => {
  t.is(util.validLon(undefined), null, 'missing argument')
  t.is(util.validLon('112.42'), 112.42, 'positive decimal input')
  t.is(util.validLon('-75.11'), -75.11, 'negative decimal input')
  t.is(util.validLon('222.22'), null, 'positive decimal overflow')
  t.is(util.validLon('-420.69'), null, 'negative decimal overflow')
  t.is(util.validLon('0'), 0, 'positive integer input')
  t.is(util.validLon('-98'), -98, 'negative integer input')
  t.is(util.validLon('1337'), null, 'positive integer overflow')
  t.is(util.validLon('-420'), null, 'negative integer overflow')
  t.is(util.validLon('foo'), null, 'non-numeric input')
  t.is(util.validLon('-21,85'), null, 'number with comma')
})

test('util.validDate()', t => {
  t.true(util.validDate('20200601'), 'valid day')
  t.true(util.validDate('20200229'), 'valid leap day')
  t.false(util.validDate('20210229'), 'invalid leap day')
  t.false(util.validDate('21000229'), 'invalid leap day (year % 100)')
  t.true(util.validDate('20000229'), 'valid leap day (year % 400)')
  t.false(util.validDate('20201301'), 'invalid month')
  t.false(util.validDate('20201240'), 'invalid day')
  t.false(util.validDate('2021-01-01'), 'non-YYYYMMDD input')
  t.false(util.validDate('foo'), 'non-date input')
})

test('util.validTime()', t => {
  t.true(util.validTime('9:10:00'), 'valid time, single-digit hour')
  t.true(util.validTime('09:10:00'), 'valid time, double-digit hour')
  t.true(util.validTime('24:20:30'), 'valid time, hour over 24')
  t.false(util.validTime('12:70:00'), 'invalid time, minutes over 60')
  t.false(util.validTime('12:60:00'), 'invalid time, minutes == 60')
  t.false(util.validTime('12:15:65'), 'invalid time, seconds over 60')
  t.false(util.validTime('12:15:60'), 'invalid time, seconds == 60')
})

test('util.timeToInt()', t => {
  t.is(util.timeToInt('9:10:20'), 33020, 'single-digit hour')
  t.is(util.timeToInt('09:10:20'), 33020, 'double-digit hour')
  t.is(util.timeToInt('26:50:40'), 96640, 'hour over 24')
})

test('util.safeColor()', t => {
  t.is(util.safeColor('808080'), '#808080', 'valid color, 0-9 digits only')
  t.is(util.safeColor('bb00bb'), '#BB00BB', 'valid color, with lower-case letters')
  t.is(util.safeColor('CCBB22'), '#CCBB22', 'valid color, with upper-case letters')
  t.is(util.safeColor('#CCBB22'), null, 'starting hash, disallowed in GTFS')
  t.is(util.safeColor('8080H9'), null, 'invalid letter')
  t.is(util.safeColor(undefined), null, 'no input')
  t.is(util.safeColor('foo'), null, 'non-color input')
})
