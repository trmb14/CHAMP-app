/**
 * After a shift is created/updated/deleted, keep payroll and invoice records current
 * if they already exist for the affected period/week.
 */

function getInvoiceWeekForDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay(); // 0=Sun … 6=Sat
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysFromMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = dt => dt.toISOString().split('T')[0];
  return { week_start: fmt(monday), week_end: fmt(sunday) };
}

function buildInvoiceNumber(abbreviation, shifts) {
  if (!shifts || shifts.length === 0) return abbreviation;
  const dates = shifts.map(s => s.shift_date).sort();
  const first = new Date(dates[0] + 'T12:00:00');
  const last = new Date(dates[dates.length - 1] + 'T12:00:00');
  const yy = String(first.getFullYear()).slice(-2);
  const m = first.getMonth() + 1;
  const firstDay = first.getDate();
  const lastDay = last.getDate();
  return firstDay === lastDay
    ? `${abbreviation}${yy}${m}${firstDay}`
    : `${abbreviation}${yy}${m}${firstDay}${lastDay}`;
}

async function syncPayrollForShift(db, employeeId, shiftDate) {
  const period = await db('pay_periods')
    .where('start_date', '<=', shiftDate)
    .where('end_date', '>=', shiftDate)
    .first();
  if (!period) return;

  const existing = await db('payroll')
    .where({ pay_period_id: period.id, employee_id: employeeId })
    .first();
  if (!existing) return;

  const employee = await db('users').where({ id: employeeId }).first();
  const shifts = await db('shifts')
    .where({ employee_id: employeeId })
    .where('shift_date', '>=', period.start_date)
    .where('shift_date', '<=', period.end_date)
    .where('status', 'approved');

  let total_hours = 0, gross_pay = 0;
  for (const s of shifts) {
    // payroll_hours already embeds stat 1.5x multiplier — use base rate only
    const rate = parseFloat(employee.pay_rate);
    gross_pay += parseFloat(s.payroll_hours) * rate;
    total_hours += parseFloat(s.payroll_hours);
  }

  const cpp = gross_pay * 0.0595;
  const ei = gross_pay * 0.0163;
  const itax = parseFloat(existing.income_tax || 0);
  const uber = parseFloat(existing.uber_misc_deduction || 0);
  const net_pay = gross_pay - cpp - ei - itax - uber;

  await db('payroll').where({ id: existing.id }).update({
    total_hours, gross_pay,
    cpp_deduction: cpp, ei_deduction: ei, net_pay,
    updated_at: new Date(),
  });
}

async function syncInvoiceForShift(db, clientId, shiftDate) {
  const { week_start, week_end } = getInvoiceWeekForDate(shiftDate);
  const invoice = await db('invoices').where({ client_id: clientId, week_start }).first();
  if (!invoice) return;

  const client = await db('clients').where({ id: clientId }).first();
  const shifts = await db('shifts')
    .where({ client_id: clientId })
    .where('shift_date', '>=', week_start)
    .where('shift_date', '<=', week_end)
    .where('status', 'approved')
    .orderBy('shift_date');

  if (shifts.length === 0) {
    // No approved shifts — zero out the invoice
    await db('invoices').where({ id: invoice.id }).update({
      subtotal: 0, hst_amount: 0, total_due: 0, updated_at: new Date(),
    });
    await db('invoice_line_items').where({ invoice_id: invoice.id }).del();
    return;
  }

  const rates = await db('billing_rates').where({ client_id: clientId }).select('position', 'rate');
  const rateMap = Object.fromEntries(rates.map(r => [r.position, parseFloat(r.rate)]));

  let subtotal = 0;
  const lineItemsData = shifts.map(s => {
    const baseRate = rateMap[s.position] || 0;
    const rate = s.is_statutory_holiday ? baseRate * 2 : baseRate;
    const total = parseFloat(s.invoice_hours) * rate;
    subtotal += total;
    return {
      invoice_id: invoice.id,
      shift_id: s.id,
      date_of_service: s.shift_date,
      shift_hours: s.invoice_hours,
      position: s.position,
      time_in: s.time_in,
      time_out: s.time_out,
      rate,
      total,
      is_statutory: s.is_statutory_holiday,
    };
  });

  const hst_amount = subtotal * 0.13;
  const total_due = subtotal + hst_amount;
  const invoice_number = buildInvoiceNumber(client.abbreviation, shifts);

  await db('invoices').where({ id: invoice.id }).update({
    invoice_number, subtotal, hst_amount, total_due, updated_at: new Date(),
  });
  await db('invoice_line_items').where({ invoice_id: invoice.id }).del();
  await db('invoice_line_items').insert(lineItemsData);
}

module.exports = { syncPayrollForShift, syncInvoiceForShift, getInvoiceWeekForDate, buildInvoiceNumber };
