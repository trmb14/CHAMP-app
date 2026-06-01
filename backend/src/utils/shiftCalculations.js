/**
 * Calculates payroll and invoice hours for a shift.
 *
 * Rules:
 *  - Invoice hours = full raw shift duration (no break deduction)
 *  - Payroll hours = raw duration - 0.5hr break (if shift > 6hrs)
 *  - Stat holiday: break first, then 1.5x multiplier applied to payroll only
 *  - Overnight stat (crossing midnight): midnight rule splits the shift —
 *    before midnight = regular rate, after midnight = (break if >6hrs) * 1.5
 */
function calculateShiftHours(time_in, time_out, is_statutory_holiday) {
  const [inH, inM] = time_in.split(':').map(Number);
  const [outH, outM] = time_out.split(':').map(Number);

  const inMins = inH * 60 + inM;
  const outMins = outH * 60 + outM;
  const isOvernight = outMins <= inMins; // time_out is next calendar day
  const totalMins = isOvernight ? (1440 - inMins) + outMins : outMins - inMins;
  const totalHours = totalMins / 60;

  // Invoice: full raw duration, no deductions whatsoever
  const invoice_hours = round2(totalHours);

  let payroll_hours;

  if (!is_statutory_holiday) {
    // Regular: 30-min break deducted only if shift > 6 hrs
    payroll_hours = totalHours > 6 ? totalHours - 0.5 : totalHours;
  } else if (isOvernight) {
    // Overnight crossing midnight into stat day — midnight rule
    const beforeMidnightHours = (1440 - inMins) / 60;
    const afterMidnightHours = outMins / 60;

    // Before midnight: regular (break if >6hrs segment)
    const beforePayroll = beforeMidnightHours > 6 ? beforeMidnightHours - 0.5 : beforeMidnightHours;

    // After midnight: stat (break if >6hrs segment, then 1.5x)
    const afterBase = afterMidnightHours > 6 ? afterMidnightHours - 0.5 : afterMidnightHours;
    const afterStatPayroll = afterBase * 1.5;

    payroll_hours = beforePayroll + afterStatPayroll;
  } else {
    // Full stat day: break first, then 1.5x
    const base = totalHours > 6 ? totalHours - 0.5 : totalHours;
    payroll_hours = base * 1.5;
  }

  return {
    payroll_hours: round2(payroll_hours),
    invoice_hours: round2(invoice_hours),
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { calculateShiftHours };
