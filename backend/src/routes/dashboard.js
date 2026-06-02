const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getCurrentPayPeriod } = require('../utils/payPeriod');
const { format, startOfWeek, endOfWeek } = require('date-fns');

router.use(authenticate);

router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const { start_date, end_date } = getCurrentPayPeriod();

    const [shiftsThisWeek] = await db('shifts')
      .where('shift_date', '>=', weekStart)
      .where('shift_date', '<=', weekEnd)
      .count('id as count');

    const [pendingInvoices] = await db('invoices')
      .whereIn('status', ['draft', 'sent'])
      .count('id as count');

    const [activeEmployees] = await db('users')
      .where({ role: 'employee', is_active: true })
      .count('id as count');

    const [pendingApprovals] = await db('users')
      .where({ status: 'pending' })
      .count('id as count');

    const currentPeriod = await db('pay_periods').where({ start_date }).first();
    const payrollSum = currentPeriod
      ? await db('payroll').where({ pay_period_id: currentPeriod.id }).sum('gross_pay as total')
      : null;

    const recentShifts = await db('shifts')
      .join('users', 'shifts.employee_id', 'users.id')
      .join('clients', 'shifts.client_id', 'clients.id')
      .select('shifts.id', 'shifts.shift_date', 'shifts.status', 'shifts.position',
        'users.name as employee_name', 'clients.name as client_name',
        'clients.abbreviation as client_abbreviation', 'shifts.created_at')
      .orderBy('shifts.created_at', 'desc')
      .limit(10);

    // All assigned shifts this week
    const weekShifts = await db('shifts')
      .join('clients', 'shifts.client_id', 'clients.id')
      .select('clients.name as client_name', 'clients.abbreviation', 'shifts.position', 'shifts.status')
      .where('shifts.shift_date', '>=', weekStart)
      .where('shifts.shift_date', '<=', weekEnd);

    // Unassigned (available) shifts this week — separate query to avoid null employee_id join issue
    const availableShifts = await db('shifts')
      .join('clients', 'shifts.client_id', 'clients.id')
      .select('clients.name as client_name', 'clients.abbreviation', 'shifts.position')
      .where('shifts.shift_date', '>=', weekStart)
      .where('shifts.shift_date', '<=', weekEnd)
      .whereNull('shifts.employee_id');

    const clientMap = {};
    const allWeekShifts = [...weekShifts, ...availableShifts.map(s => ({ ...s, status: 'available' }))];

    // Deduplicate: weekShifts may already include unassigned rows if shim handles it; use a Set on identity
    const seen = new Set();
    for (const s of allWeekShifts) {
      const key = `${s.abbreviation}|${s.position}|${s.status}`;
      if (seen.has(key)) continue;
      // Only deduplicate available duplicates (assigned shifts from weekShifts already have employee_id)
      if (s.status === 'available') seen.add(key);

      if (!clientMap[s.abbreviation]) {
        clientMap[s.abbreviation] = { name: s.client_name, abbreviation: s.abbreviation, count: 0, positions: [], statuses: {} };
      }
      clientMap[s.abbreviation].count++;
      if (!clientMap[s.abbreviation].positions.includes(s.position)) {
        clientMap[s.abbreviation].positions.push(s.position);
      }
      const st = s.status || 'pending';
      clientMap[s.abbreviation].statuses[st] = (clientMap[s.abbreviation].statuses[st] || 0) + 1;
    }
    const week_clients = Object.values(clientMap).sort((a, b) => b.count - a.count);

    res.json({
      shifts_this_week: parseInt(shiftsThisWeek.count),
      pending_invoices: parseInt(pendingInvoices.count),
      active_employees: parseInt(activeEmployees.count),
      pending_approvals: parseInt(pendingApprovals.count),
      total_payroll_period: parseFloat(payrollSum?.total ?? payrollSum?.[0]?.total ?? 0),
      pay_period: { start_date, end_date },
      recent_shifts: recentShifts,
      week_clients,
    });
  } catch (err) { next(err); }
});

router.get('/employee', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const { start_date, end_date } = getCurrentPayPeriod();

    const upcomingShifts = await db('shifts')
      .join('clients', 'shifts.client_id', 'clients.id')
      .select('shifts.*', 'clients.name as client_name', 'clients.address as client_address', 'clients.abbreviation')
      .where('shifts.employee_id', req.user.id)
      .where('shifts.shift_date', '>=', today)
      .orderBy('shifts.shift_date')
      .orderBy('shifts.time_in')
      .limit(5);

    const periodShifts = await db('shifts')
      .where('employee_id', req.user.id)
      .where('shift_date', '>=', start_date)
      .where('shift_date', '<=', end_date)
      .where('status', 'approved');

    let periodHours = 0;
    periodShifts.forEach(s => { periodHours += parseFloat(s.payroll_hours || 0); });

    const latestPaystub = await db('payroll')
      .join('pay_periods', 'payroll.pay_period_id', 'pay_periods.id')
      .select('payroll.*', 'pay_periods.start_date', 'pay_periods.end_date')
      .where('payroll.employee_id', req.user.id)
      .whereNotNull('payroll.pdf_url')
      .orderBy('pay_periods.start_date', 'desc')
      .first();

    res.json({
      upcoming_shifts: upcomingShifts,
      period_hours: periodHours,
      pay_period: { start_date, end_date },
      latest_paystub: latestPaystub || null,
    });
  } catch (err) { next(err); }
});

router.get('/client', async (req, res, next) => {
  try {
    if (req.user.role !== 'client' && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find the client facility record
    const client = req.user.client_facility
      ? await db('clients').where({ name: req.user.client_facility }).first()
      : null;

    if (!client) {
      return res.json({
        client: null,
        outstanding: 0,
        paid_this_year: 0,
        total_invoices: 0,
        last_invoice: null,
        recent_invoices: [],
      });
    }

    const invoices = await db('invoices')
      .where({ client_id: client.id })
      .orderBy('week_start', 'desc');

    const outstanding = invoices
      .filter(i => ['draft', 'sent'].includes(i.status))
      .reduce((s, i) => s + parseFloat(i.total_due || 0), 0);

    const currentYear = new Date().getFullYear();
    const paidThisYear = invoices
      .filter(i => i.status === 'paid' && new Date(i.week_start + 'T12:00:00').getFullYear() === currentYear)
      .reduce((s, i) => s + parseFloat(i.total_due || 0), 0);

    const addInvoiceDate = (inv) => {
      if (!inv) return inv;
      const d = new Date(inv.week_end + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      return { ...inv, invoice_date: d.toISOString().split('T')[0] };
    };

    res.json({
      client,
      outstanding,
      paid_this_year: paidThisYear,
      total_invoices: invoices.length,
      last_invoice: invoices[0] ? addInvoiceDate(invoices[0]) : null,
      recent_invoices: invoices.slice(0, 3).map(addInvoiceDate),
    });
  } catch (err) { next(err); }
});

module.exports = router;
