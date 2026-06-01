// Canadian federal + Ontario provincial statutory holidays
const { format, getYear, addDays, setDay, startOfMonth, getDay } = require('date-fns');

function nthWeekdayOfMonth(year, month, weekday, n) {
  // month: 0-indexed, weekday: 0=Sun, 1=Mon...
  const first = new Date(year, month, 1);
  const firstWeekday = getDay(first);
  let day = 1 + ((weekday - firstWeekday + 7) % 7) + (n - 1) * 7;
  return new Date(year, month, day);
}

function getStatutoryHolidays(year) {
  const holidays = [];

  // Fixed date holidays
  holidays.push(format(new Date(year, 0, 1), 'yyyy-MM-dd'));  // New Year's Day
  holidays.push(format(new Date(year, 6, 1), 'yyyy-MM-dd'));  // Canada Day
  holidays.push(format(new Date(year, 11, 25), 'yyyy-MM-dd')); // Christmas Day
  holidays.push(format(new Date(year, 11, 26), 'yyyy-MM-dd')); // Boxing Day

  // Good Friday & Easter Monday
  const easter = getEaster(year);
  holidays.push(format(addDays(easter, -2), 'yyyy-MM-dd')); // Good Friday
  holidays.push(format(addDays(easter, 1), 'yyyy-MM-dd'));  // Easter Monday

  // Victoria Day — Monday before May 25
  let may25 = new Date(year, 4, 25);
  let victoriaDayOffset = getDay(may25) === 1 ? -7 : -(getDay(may25) === 0 ? 6 : getDay(may25) - 1);
  if (getDay(may25) === 0) victoriaDayOffset = -6;
  else if (getDay(may25) === 1) victoriaDayOffset = -7;
  else victoriaDayOffset = -(getDay(may25) - 1);
  holidays.push(format(addDays(may25, victoriaDayOffset), 'yyyy-MM-dd'));

  // Labour Day — 1st Monday in September
  holidays.push(format(nthWeekdayOfMonth(year, 8, 1, 1), 'yyyy-MM-dd'));

  // Thanksgiving — 2nd Monday in October
  holidays.push(format(nthWeekdayOfMonth(year, 9, 1, 2), 'yyyy-MM-dd'));

  // Civic Holiday (Ontario) — 1st Monday in August
  holidays.push(format(nthWeekdayOfMonth(year, 7, 1, 1), 'yyyy-MM-dd'));

  // Family Day (Ontario) — 3rd Monday in February
  holidays.push(format(nthWeekdayOfMonth(year, 1, 1, 3), 'yyyy-MM-dd'));

  // Remembrance Day
  holidays.push(format(new Date(year, 10, 11), 'yyyy-MM-dd'));

  return [...new Set(holidays)];
}

// Gregorian Easter algorithm (Anonymous)
function getEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function isStatutoryHoliday(dateStr) {
  const year = parseInt(dateStr.substring(0, 4));
  const holidays = getStatutoryHolidays(year);
  return holidays.includes(dateStr);
}

module.exports = { getStatutoryHolidays, isStatutoryHoliday };
