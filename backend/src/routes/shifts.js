const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { isStatutoryHoliday } = require('../utils/holidays');
const { calculateShiftHours } = require('../utils/shiftCalculations');
const { syncPayrollForShift, syncInvoiceForShift } = require('../utils/syncRecords');
const { notifyShiftAssigned, notifyShiftClaimRequest } = require('../services/notificationService');

router.use(authenticate);

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Get shifts — admin sees all, employee sees own
router.get('/', async (req, res, next) => {
  try {
    const { employee_id, client_id, start_date, end_date, status, month, year } = req.query;

    let query = db('shifts')
      .join('users', 'shifts.employee_id', 'users.id')
      .join('clients', 'shifts.client_id', 'clients.id')
      .select(
        'shifts.*',
        'users.name as employee_name',
        'users.position as employee_position',
        'clients.name as client_name',
        'clients.abbreviation as client_abbreviation'
      );

    if (req.user.role === 'employee') {
      query = query.where('shifts.employee_id', req.user.id);
    } else {
      if (employee_id) query = query.where('shifts.employee_id', employee_id);
      if (client_id) query = query.where('shifts.client_id', client_id);
    }

    if (start_date) query = query.where('shifts.shift_date', '>=', start_date);
    if (end_date) query = query.where('shifts.shift_date', '<=', end_date);
    if (status) query = query.where('shifts.status', status);
    if (month && year) {
      const y = parseInt(year), m = parseInt(month);
      const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
      const monthEnd = new Date(y, m, 0).toISOString().split('T')[0];
      query = query.where('shifts.shift_date', '>=', monthStart).where('shifts.shift_date', '<=', monthEnd);
    }

    const shifts = await query.orderBy('shifts.shift_date').orderBy('shifts.time_in');
    res.json(shifts);
  } catch (err) { next(err); }
});

// Available shifts: current week, no employee assigned
router.get('/available', async (req, res, next) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // roll back to Monday
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const weekStart = monday.toISOString().split('T')[0];
    const weekEnd = sunday.toISOString().split('T')[0];

    const shifts = await db('shifts')
      .join('clients', 'shifts.client_id', 'clients.id')
      .select(
        'shifts.id', 'shifts.shift_date', 'shifts.time_in', 'shifts.time_out',
        'shifts.position', 'shifts.status', 'shifts.payroll_hours', 'shifts.invoice_hours',
        'clients.name as client_name', 'clients.abbreviation as client_abbreviation'
      )
      .whereNull('shifts.employee_id')
      .where('shifts.shift_date', '>=', weekStart)
      .where('shifts.shift_date', '<=', weekEnd)
      .orderBy('shifts.shift_date')
      .orderBy('shifts.time_in');

    res.json(shifts);
  } catch (err) { next(err); }
});

// Claim a shift — notifies admins for approval
router.post('/:id/claim', async (req, res, next) => {
  try {
    const shift = await db('shifts').where({ id: req.params.id }).first();
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    if (shift.employee_id) return res.status(409).json({ error: 'This shift has already been assigned' });

    notifyShiftClaimRequest(db, req.params.id, req.user).catch(console.error);
    res.json({ success: true, message: 'Your claim request has been sent to the administrator.' });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const shift = await db('shifts')
      .join('users', 'shifts.employee_id', 'users.id')
      .join('clients', 'shifts.client_id', 'clients.id')
      .select('shifts.*', 'users.name as employee_name', 'clients.name as client_name', 'clients.abbreviation as client_abbreviation')
      .where('shifts.id', req.params.id)
      .first();
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    if (req.user.role === 'employee' && shift.employee_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(shift);
  } catch (err) { next(err); }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { employee_id, client_id, shift_date, time_in, time_out, position, notes, is_statutory_holiday } = req.body;
    if (!employee_id || !client_id || !shift_date || !time_in || !time_out || !position) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const isStatutory = is_statutory_holiday !== undefined
      ? Boolean(is_statutory_holiday)
      : isStatutoryHoliday(shift_date);

    const { payroll_hours, invoice_hours } = calculateShiftHours(time_in, time_out, isStatutory);
    const day_of_week = DAYS[new Date(shift_date + 'T12:00:00').getDay()];

    const [shift] = await db('shifts').insert({
      employee_id, client_id, shift_date, day_of_week,
      time_in, time_out, payroll_hours, invoice_hours,
      position, is_statutory_holiday: isStatutory,
      notes, status: 'pending',
    }).returning('*');

    notifyShiftAssigned(db, shift.id).catch(console.error);

    // Sync related records (fire-and-forget — don't block the response)
    Promise.all([
      syncPayrollForShift(db, employee_id, shift_date),
      syncInvoiceForShift(db, client_id, shift_date),
    ]).catch(console.error);

    res.status(201).json(shift);
  } catch (err) { next(err); }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const existing = await db('shifts').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Shift not found' });

    const {
      employee_id = existing.employee_id,
      client_id = existing.client_id,
      shift_date = existing.shift_date,
      time_in = existing.time_in,
      time_out = existing.time_out,
      position = existing.position,
      notes,
      status,
      is_statutory_holiday,
    } = req.body;

    const isStatutory = is_statutory_holiday !== undefined
      ? Boolean(is_statutory_holiday)
      : (shift_date !== existing.shift_date ? isStatutoryHoliday(shift_date) : existing.is_statutory_holiday);

    const { payroll_hours, invoice_hours } = calculateShiftHours(time_in, time_out, isStatutory);
    const day_of_week = DAYS[new Date(shift_date + 'T12:00:00').getDay()];

    const updates = {
      employee_id, client_id, shift_date, day_of_week,
      time_in, time_out, payroll_hours, invoice_hours,
      position, is_statutory_holiday: isStatutory,
      updated_at: new Date(),
    };
    if (notes !== undefined) updates.notes = notes;
    if (status !== undefined) updates.status = status;

    const [shift] = await db('shifts').where({ id: req.params.id }).update(updates).returning('*');

    // Sync both old and new employee/client if they changed
    const affectedEmployees = new Set([existing.employee_id, employee_id]);
    const affectedClients = new Set([existing.client_id, client_id]);
    const affectedDates = new Set([existing.shift_date, shift_date]);

    for (const empId of affectedEmployees) {
      for (const dt of affectedDates) {
        syncPayrollForShift(db, empId, dt).catch(console.error);
      }
    }
    for (const cId of affectedClients) {
      for (const dt of affectedDates) {
        syncInvoiceForShift(db, cId, dt).catch(console.error);
      }
    }

    res.json(shift);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const shift = await db('shifts').where({ id: req.params.id }).first();
    if (!shift) return res.status(404).json({ error: 'Shift not found' });

    await db('shifts').where({ id: req.params.id }).del();

    syncPayrollForShift(db, shift.employee_id, shift.shift_date).catch(console.error);
    syncInvoiceForShift(db, shift.client_id, shift.shift_date).catch(console.error);

    res.json({ success: true });
  } catch (err) { next(err); }
});

// Employee confirms their shift
router.patch('/:id/confirm', async (req, res, next) => {
  try {
    const shift = await db('shifts').where({ id: req.params.id }).first();
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    if (req.user.role === 'employee' && shift.employee_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const [updated] = await db('shifts')
      .where({ id: req.params.id })
      .update({ confirmed: true, confirmed_at: new Date(), updated_at: new Date() })
      .returning('*');
    res.json(updated);
  } catch (err) { next(err); }
});

// Bulk approve
router.post('/bulk-approve', requireAdmin, async (req, res, next) => {
  try {
    const { shift_ids } = req.body;
    const shifts = await db('shifts').whereIn('id', shift_ids);
    await db('shifts').whereIn('id', shift_ids).update({ status: 'approved', updated_at: new Date() });

    // Sync all affected employees and clients
    for (const s of shifts) {
      syncPayrollForShift(db, s.employee_id, s.shift_date).catch(console.error);
      syncInvoiceForShift(db, s.client_id, s.shift_date).catch(console.error);
    }

    res.json({ success: true, count: shift_ids.length });
  } catch (err) { next(err); }
});

module.exports = router;
