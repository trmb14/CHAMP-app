const { addDays, format, parseISO, isWithinInterval, startOfDay } = require('date-fns');

// Pay periods run Thursday → Wednesday (2 weeks)
function getCurrentPayPeriod(date = new Date()) {
  // Find the most recent Thursday on or before date
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon... 4=Thu
  const daysBack = (dayOfWeek - 4 + 7) % 7;
  const periodStart = new Date(d);
  periodStart.setDate(d.getDate() - daysBack);

  // If we're in the second week, go back another 7 days if needed
  // Actually, periods are always 14 days starting on Thursday
  // Use a reference Thursday to align
  const referenceThursday = new Date(2026, 4, 21); // May 21 2026 — local midnight, avoids UTC parse offset
  const msPerPeriod = 14 * 24 * 60 * 60 * 1000;
  const msDiff = periodStart.getTime() - referenceThursday.getTime();
  const periodsElapsed = Math.floor(msDiff / msPerPeriod);
  const alignedStart = new Date(referenceThursday.getTime() + periodsElapsed * msPerPeriod);
  const alignedEnd = new Date(alignedStart.getTime() + 13 * 24 * 60 * 60 * 1000);

  return {
    start_date: format(alignedStart, 'yyyy-MM-dd'),
    end_date: format(alignedEnd, 'yyyy-MM-dd'),
  };
}

function getInvoiceWeek(date = new Date()) {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
  // Week runs Monday → Sunday
  const daysToMonday = (dayOfWeek - 1 + 7) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    week_start: format(monday, 'yyyy-MM-dd'),
    week_end: format(sunday, 'yyyy-MM-dd'),
  };
}

module.exports = { getCurrentPayPeriod, getInvoiceWeek };
