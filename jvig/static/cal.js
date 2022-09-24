/*
jvig - GTFS Viewer, created using Flask.
Copyright © 2022 Mikołaj Kuranowski

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
"use strict";

/**
 * Generates all integers from zero (inclusive) to stop (exclusive).
 * @param {number} stop
 * @yields {number}
 */
function* range(stop) {
    for (let i = 0; i < stop; ++i) yield i;
}

/**
 * @template T
 * @param {Iterable<T>} it
 * @param {number=} start
 * @returns {Generator<[number, T], void, void>}
 */
function* enumerate(it, start = 0) {
    for (const i of it) yield [start++, i];
}

/** Represents a day in the Gregorian Calendar */
class SimpleDate {
    /**
     * Constructs a SimpleDate.
     * @param {number} y - year - must be a safe integer not smaller than zero
     * @param {number} m - month - must be a safe integer between 1 and 12 (incl.)
     * @param {number} d - day - must be a safe integer larger than 1 (incl.)
     *                     and not bigger than the amount of days in given month.
     */
    constructor(y, m, d) {
        this.y = y;
        this.m = m;
        this.d = d;
        if (!this.isValid()) throw new RangeError(`invalid date: ${y}-${m}-${d}`);
    }

    /**
     * Returns a SimpleDate representing _today_, local time.
     * @returns {SimpleDate}
     */
    static today() {
        const now = new Date();
        return new SimpleDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    /**
     * Parses an ISO date (YYYY-MM-DD) into a SimpleDate instance.
     * @param {string} str
     */
    static fromString(str) {
        const y = parseInt(str.substring(0, 4), 10);
        const m = parseInt(str.substring(5, 7), 10);
        const d = parseInt(str.substring(8, 10), 10);
        return new SimpleDate(y, m, d);
    }

    /**
     * Formats the date using the ISO format (YYYY-MM-DD)
     * @returns {string}
     */
    toString() {
        return `${this.y.toFixed(0).padStart(4, "0")}-${this.m.toFixed(0).padStart(2, "0")}-${this.d.toFixed(0).padStart(2, "0")}`;
    }

    /**
     * Converts the SimpleDate object to a JS plain Date object.
     * @returns {Date}
     */
    toDate() {
        return new Date(this.toString());
    }

    /**
     * Returns the amount of days in the given month, accounting for leap years.
     * @param y {number} - year - must be a safe integer not smaller than zero
     * @param m {number} - month - must be a safe integer between 1 and 12 (incl.)
     * @returns {number}
     */
    static daysInMonth(y, m) {
        if (!Number.isSafeInteger(y) || !Number.isSafeInteger(m)) throw new TypeError("safe integer expected");
        switch (m) {
        case 1:
        case 3:
        case 5:
        case 7:
        case 8:
        case 10:
        case 12:
            return 31;
        case 4:
        case 6:
        case 9:
        case 11:
            return 30;
        case 2:
            return SimpleDate.isLeap(y) ? 29 : 28;
        default:
            throw new RangeError("invalid month");
        }
    }

    /**
     * Returns true if the current year is leap
     * @param y {number}
     * @returns {boolean}
     */
    static isLeap(y) {
        if (!Number.isSafeInteger(y)) throw new TypeError("safe integer expected");
        if (y % 4 !== 0) return false;
        if (y % 100 !== 0) return true;
        if (y % 400 !== 0) return false;
        return true;
    }

    /**
     * Checks if the current state of a SimpleDate object points to a valid date
     * @returns {boolean}
     */
    isValid() {
        return (
            Number.isSafeInteger(this.y)
            && Number.isSafeInteger(this.m)
            && Number.isSafeInteger(this.d)
            && this.y >= 0
            && this.m >= 1
            && this.m <= 12
            && this.d >= 1
            && this.d <= SimpleDate.daysInMonth(this.y, this.m)
        );
    }

    /**
     * Returns full name of a month in English
     * @returns {string}
     */
    monthName() {
        switch (this.m) {
        case 1:
            return "January";
        case 2:
            return "February";
        case 3:
            return "March";
        case 4:
            return "April";
        case 5:
            return "May";
        case 6:
            return "June";
        case 7:
            return "July";
        case 8:
            return "August";
        case 9:
            return "September";
        case 10:
            return "October";
        case 11:
            return "November";
        case 12:
            return "December";
        default:
            throw new RangeError("invalid date");
        }
    }

    /**
     * Returns the weekday of the day, where
     * 0 - Monday, 1 - Tuesday, ..., 6 - Sunday.
     * @returns {number}
     */
    weekday() {
        // Sakamoto's algorithm: https://en.wikipedia.org/wiki/Determination_of_the_day_of_the_week#Sakamoto's_methods
        const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
        const y = this.m < 3 ? this.y - 1 : this.y;
        const w = (y + Math.trunc(y / 4) - Math.trunc(y / 100) + Math.trunc(y / 400) + t[this.m - 1] + this.d) % 7;

        // Shift result over so that Monday == 0, Sunday == 6
        return w === 0 ? 6 : w - 1;
    }

    /**
     * Returns the 3-letter English abbreviation of the current weekday
     * @returns {string}
     */
    weekdayName() {
        switch (this.weekday()) {
        case 0:
            return "Mon";
        case 1:
            return "Tue";
        case 2:
            return "Wed";
        case 3:
            return "Thu";
        case 4:
            return "Fri";
        case 5:
            return "Sat";
        case 6:
            return "Sun";
        default:
            throw new RangeError("invalid date");
        }
    }

    /**
     * Checks if `this` is a date that occurs after `o`
     * @param {SimpleDate} o
     * @returns {boolean}
     */
    after(o) {
        return (
            this.y > o.y
            || (this.y === o.y && this.m > o.m)
            || (this.y === o.y && this.m === o.m && this.d > o.d)
        );
    }

    /**
     * Checks if `this` is a date that occurs before `o`
     * @param {SimpleDate} o
     * @returns {boolean}
     */
    before(o) {
        return (
            this.y < o.y
            || (this.y === o.y && this.m < o.m)
            || (this.y === o.y && this.m === o.m && this.d < o.d)
        );
    }

    /**
     * Checks if `this` is the same date as `o`
     * @param {SimpleDate} o
     * @returns {boolean}
     */
    equals(o) {
        return this.y === o.y && this.m === o.m && this.d === o.d;
    }

    /**
     * Returns a SimpleDate that's `days` after (or before if `days` is negative) `this`.
     * @param {number} days
     * @returns {SimpleDate}
     */
    add(days) {
        if (!Number.isSafeInteger(days)) throw new TypeError("safe integer expected");
        let ny = this.y;
        let nm = this.m;
        let nd = this.d + days;

        while (nd > SimpleDate.daysInMonth(ny, nm)) {
            nd -= SimpleDate.daysInMonth(ny, nm)
            if (nm == 12) {
                ++ny;
                nm = 1
            } else {
                ++nm;
            }
        }

        while (nd < 1) {
            if (nm === 1) {
                --ny;
                nm = 12;
            } else {
                --nm;
            }
            nd += SimpleDate.daysInMonth(ny, nm);
        }

        return new SimpleDate(ny, nm, nd);
    }

    /**
     * Equivalent to `add(1)`
     * @returns {SimpleDate}
     */
    nextDay() {
        return this.add(1);
    }

    /**
     * Equivalent to `add(-1)`
     * @returns {SimpleDate}
     */
    previousDay() {
        return this.add(-1);
    }

    /**
     * Tries to return the same day in the following month, truncating to the
     * amount of days available in the next month.
     *
     * Examples:
     * - 2022-06-10 → 2022-07-10
     * - 2022-12-31 → 2023-01-31
     * - 2022-05-31 → 2022-06-30
     * - 2022-01-31 → 2022-02-28
     * - 2020-01-31 → 2020-02-29 (leap year)
     *
     * @returns {SimpleDate}
     */
    nextMonth() {
        if (this.m === 12) {
            return new SimpleDate(this.y + 1, 1, this.d);
        } else {
            return new SimpleDate(
                this.y,
                this.m + 1,
                Math.min(this.d, SimpleDate.daysInMonth(this.y, this.m + 1))
            );
        }
    }

    /**
     * Tries to return the same day in the preceding month, truncating to the
     * amount of days available in the next month.
     *
     * Examples:
     * - 2022-06-10 → 2022-05-10
     * - 2023-01-31 → 2022-12-31
     * - 2022-07-31 → 2022-06-30
     * - 2022-03-31 → 2022-02-28
     * - 2020-03-31 → 2020-02-29 (leap year)
     *
     * @returns {SimpleDate}
     */
    prevMonth() {
        if (this.m === 1) {
            return new SimpleDate(this.y - 1, 12, this.d);
        } else {
            return new SimpleDate(
                this.y,
                this.m - 1,
                Math.min(this.d, SimpleDate.daysInMonth(this.y, this.m - 1))
            );
        }
    }

    /**
     * Returns the same day and month in the following year, with 29th Feb mapped to 28th Feb.
     *
     * Examples:
     * - 2022-06-10 → 2023-06-10
     * - 2022-01-31 → 2023-01-31
     * - 2020-02-29 → 2021-02-28
     *
     * @returns {SimpleDate}
     */
    nextYear() {
        return new SimpleDate(
            this.y + 1,
            this.m,
            Math.min(this.d, SimpleDate.daysInMonth(this.y + 1, this.m))
        );
    }

    /**
     * Returns the same day and month in the preceding year, with 29th Feb mapped to 28th Feb.
     *
     * Examples:
     * - 2022-06-10 → 2021-06-10
     * - 2022-01-31 → 2021-01-31
     * - 2020-02-29 → 2019-02-28
     *
     * @returns {SimpleDate}
     */
    prevYear() {
        return new SimpleDate(
            this.y - 1,
            this.m,
            Math.min(this.d, SimpleDate.daysInMonth(this.y - 1, this.m))
        );
    }
}

/** Manages a container by inserting a single-month calendar into it */
class Calendar {
    /**
     * Function that will be called on every cell injected into the calendar
     * @callback onCell
     * @param {HTMLTableCellElement} td - HTML cell
     * @param {CalendarTableEntry} cal - Calendar cell
     */

    /**
     * Generates an `onCell` callback, which sets a "calendar-active" class on
     * a cell if a date belongs to the provided set; and "calendar-inactive" class
     * if a date doesn't belong to the provided set.
     *
     * @param {Set<string>} dates
     * @returns {onCell}
     */
    static generateOnCellIfInSet(dates) {
        return (td, cal) => {
            td.classList.add(dates.has(cal.date.toString()) ? "calendar-active" : "calendar-inactive");
        }
    }

    /**
     * Creates a Calendar and paints the initial year and month
     * @param {HTMLDivElement} container
     * @param {number} year
     * @param {number} month
     * @param {onCell?} onCell - function called on each generated table cell
     */
    constructor(container, year, month, onCell) {
        this.container = container;
        this.year = year;
        this.month = month;
        this.onCell = onCell;
        this.redraw();
    }

    /**
     * Returns the first day of the currently active month
     * @returns {SimpleDate}
     */
    day() {
        return new SimpleDate(this.year, this.month, 1);
    }

    /**
     * Returns a "monthName Year" string for this.day(), or a specific date.
     * @param {SimpleDate=} forDay
     * @returns {string}
     */
    getLabelText(forDay) {
        forDay ??= this.day();
        return `${forDay.monthName()} ${forDay.y.toFixed(0).padStart(4, "0")}`;
    }

    /**
     * Advances by a single month and redraws the table.
     * @returns {void}
     */
    nextMonth() {
        if (this.month === 12) {
            ++this.year;
            this.month = 1;
        } else {
            ++this.month;
        }

        this.redraw();
    }

    /**
     * Backtracks by a single month and redraws the table.
     * @returns {void}
     */
    previousMonth() {
        if (this.month === 1) {
            --this.year;
            this.month = 12;
        } else {
            --this.month;
        }

        this.redraw();
    }

    /**
     * Creates the first row (with 7 columns) - prev/next buttons and a month label
     * @returns {HTMLTableRowElement}
     */
    getLabelRow() {
        const prevAnchor = document.createElement("a");
        prevAnchor.innerText = "«";
        prevAnchor.onclick = this.previousMonth.bind(this);
        const prev = document.createElement("th");
        prev.appendChild(prevAnchor);

        const nextAnchor = document.createElement("a");
        nextAnchor.innerText = "»";
        nextAnchor.onclick = this.nextMonth.bind(this);
        const next = document.createElement("th");
        next.appendChild(nextAnchor);

        const label = document.createElement("th");
        label.innerText = this.getLabelText();
        label.colSpan = 5;

        const row = document.createElement("tr");
        row.append(prev, label, next);

        return row;
    }

    /**
     * Creates the second row (with 7 columns) - weekday names
     * @returns {HTMLTableRowElement}
     */
    getWeekdaysRow() {
        const row = document.createElement("tr");
        for (const weekday of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
            const l = document.createElement("th");
            l.innerText = weekday;
            row.append(l);
        }
        return row;
    }

    /**
     * @typedef CalendarTableEntry
     * @type {object}
     * @property {string} text - the string representation of the day number
     * @property {SimpleDate} date - the actual date represented by this cell
     * @property {boolean} otherMonth - whether the day belongs to another month
     */

    /**
     * Generates a monthly calendar table for a given month pair
     * @param {SimpleDate} d - first day of the month
     * @returns {CalendarTableEntry[][]}
     */
    static tableForMonth(d) {
        const month = d.m;
        const table = [];
        d = d.add(-d.weekday());  // Always start at a monday

        for (let first = true; first || d.m === month; first = false) {
            const row = [];
            for (let i = 0; i < 7; ++i) {
                row.push({ text: d.d.toFixed(0), date: d, otherMonth: d.m !== month });
                d = d.add(1);
            }
            table.push(row);
        }

        return table;
    }

    /**
     * Redraws the table in the container
     * @returns {void}
     */
    redraw() {
        // Create a table
        const table = document.createElement("table");

        // Add the header row with month name and back/forward buttons
        table.append(this.getLabelRow(), this.getWeekdaysRow());

        // Add the dates to the table
        const cal = Calendar.tableForMonth(this.day());
        const rows = cal.map(row => {
            const r = document.createElement("tr");
            r.append(...row.map(cell => {
                const c = document.createElement("td");
                c.innerText = cell.text;
                if (cell.otherMonth) c.classList.add("calendar-other-month");
                this.onCell?.(c, cell);
                return c;
            }));
            return r;
        });
        table.append(...rows);

        // Replace the current table with the newly generated one
        this.container.replaceChildren(table);
    }
}

/**
 * Manages a container by inserting a single-month calendar into it
 *
 * @extends {Calendar}
 */
class TripleCalendar extends Calendar {
    /**
     * Creates the first row (with 21 columns) - prev/next buttons and a 3 month labels
     * @returns {HTMLTableRowElement}
     */
    getLabelRow() {
        const prevAnchor = document.createElement("a");
        prevAnchor.innerText = "«";
        prevAnchor.onclick = this.previousMonth.bind(this);
        const prev = document.createElement("th");
        prev.appendChild(prevAnchor);

        let d = this.day();
        const label1 = document.createElement("th");
        label1.innerText = this.getLabelText(d);
        label1.colSpan = 6;
        label1.classList.add("calendar-triple-right-border");

        d = d.nextMonth();
        const label2 = document.createElement("th");
        label2.innerText = this.getLabelText(d);
        label2.colSpan = 7;
        label2.classList.add("calendar-triple-right-border");

        d = d.nextMonth();
        const label3 = document.createElement("th");
        label3.innerText = this.getLabelText(d);
        label3.colSpan = 6;

        const nextAnchor = document.createElement("a");
        nextAnchor.innerText = "»";
        nextAnchor.onclick = this.nextMonth.bind(this);
        const next = document.createElement("th");
        next.appendChild(nextAnchor);

        const row = document.createElement("tr");
        row.append(prev, label1, label2, label3, next);

        return row;
    }

    /**
     * Creates the second row (with 21 columns) - weekday names repeated 3 times
     * @returns {HTMLTableRowElement}
     */
    getWeekdaysRow() {
        const row = document.createElement("tr");
        for (const idx of range(3)) {
            for (const weekday of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
                const l = document.createElement("th");
                l.innerText = weekday;
                if (idx < 2 && weekday === "Sun")
                    l.classList.add("calendar-triple-right-border");
                row.append(l);
            }
        }
        return row;
    }

    /**
     * Redraws the table in the container
     * @returns {void}
     */
    redraw() {
        // Create a table
        const table = document.createElement("table");
        table.classList.add("calendar-root", "calendar-triple");

        // Add the header row with month name and back/forward buttons
        table.append(this.getLabelRow(), this.getWeekdaysRow());

        // Create a table for each month
        const calendars = [
            Calendar.tableForMonth(this.day()),
            Calendar.tableForMonth(this.day().nextMonth()),
            Calendar.tableForMonth(this.day().nextMonth().nextMonth()),
        ];

        /** @type {HTMLTableRowElement[]} */
        const rows = new Array(
            Math.max(calendars[0].length, calendars[1].length, calendars[2].length)
        );

        for (const rowIdx of range(rows.length)) {
            rows[rowIdx] = document.createElement("tr");
            for (const calIdx of range(3)) {

                if (calendars[calIdx][rowIdx] === undefined) {
                    const td = document.createElement("td");
                    td.colSpan = 7;
                    td.classList.add("calendar-empty-row");
                    if (calIdx === 1)
                        td.classList.add("calendar-triple-right-border", "calendar-triple-left-border");
                    rows[rowIdx].append(td);
                } else for (const [cellIdx, day] of enumerate(calendars[calIdx][rowIdx])) {
                    const td = document.createElement("td");
                    td.innerText = day.text;

                    if (day.otherMonth)
                        td.classList.add("calendar-other-month");
                    if ((calIdx === 1 || calIdx === 2) && cellIdx === 0)
                        td.classList.add("calendar-triple-left-border");
                    if ((calIdx === 0 || calIdx === 1) && cellIdx === 6)
                        td.classList.add("calendar-triple-right-border");

                    this.onCell?.(td, day);
                    rows[rowIdx].append(td);
                }

            }
        }

        table.append(...rows);

        // Replace the current table with the newly generated one
        this.container.replaceChildren(table);
    }
}

/**
 * Automatically sets up a TripleCalendar showing dates of a given calendar
 * @param {string} divId
 * @param {string} serviceId
 */
function showServiceActiveDates(divId, serviceId) {
    fetch(`/api/calendar/days/${encodeURIComponent(serviceId)}`)
    .then(r => r.json())
    .then(datesList => {
        const dates = new Set(datesList);

        // Select the earliest date to focus the calendar on
        let earliest = null;
        for (const dayStr of dates) {
          const day = SimpleDate.fromString(dayStr);
          if (earliest === null || day.before(earliest)) {
            earliest = day;
          }
        }

        // If calendar had no active dates focus on today
        earliest ??= SimpleDate.today();

        new TripleCalendar(
          document.getElementById(divId),
          earliest.y,
          earliest.m,
          Calendar.generateOnCellIfInSet(dates),
        );
      });
}
