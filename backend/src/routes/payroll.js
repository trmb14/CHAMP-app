const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { generatePaystubPDF, generatePayrollSummaryPDF } = require('../services/pdfService');
const { uploadPDF } = require('../services/storageService');
const { notifyPaystubReady } = require('../services/notificationService');
const { format } = require('date-fns');

router.use(authenticate);

// Get payroll for a period
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { pay_period_id } = req.query;
    if (!pay_period_id) return res.status(400).json({ error: 'pay_period_id required' });

    const payrollRecords = await db('payroll')
      .join('users', 'payroll.employee_id', 'users.id')
      .join('pay_periods', 'payroll.pay_period_id', 'pay_periods.id')
      .select(
        'payroll.*',
        'users.name as employee_name',
        'users.position as employee_position',
        'users.pay_rate'
      )
      .where('payroll.pay_period_id', pay_period_id);

    payrollRecords.sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''));
    res.json(payrollRecords);
  } catch (err) { next(err); }
});

// Employee views their own paystubs
router.get('/my-paystubs', authenticate, async (req, res, next) => {
  try {
    const records = await db('payroll')
      .join('pay_periods', 'payroll.pay_period_id', 'pay_periods.id')
      .select('payroll.*', 'pay_periods.start_date', 'pay_periods.end_date', 'pay_periods.status as period_status')
      .where('payroll.employee_id', req.user.id)
      .orderBy('pay_periods.start_date', 'desc');
    res.json(records);
  } catch (err) { next(err); }
});

// Calculate payroll preview for a period
router.get('/calculate/:pay_period_id', requireAdmin, async (req, res, next) => {
  try {
    const { pay_period_id } = req.params;
    const period = await db('pay_periods').where({ id: pay_period_id }).first();
    if (!period) return res.status(404).json({ error: 'Pay period not found' });

    const shifts = await db('shifts')
      .join('users', 'shifts.employee_id', 'users.id')
      .select('shifts.*', 'users.name as employee_name', 'users.pay_rate', 'users.position as emp_position')
      .where('shifts.shift_date', '>=', period.start_date)
      .where('shifts.shift_date', '<=', period.end_date)
      .where('shifts.status', 'approved');

    // Group by employee
    // Note: payroll_hours already embeds the stat 1.5x multiplier — use base pay_rate only
    const byEmployee = {};
    for (const shift of shifts) {
      if (!byEmployee[shift.employee_id]) {
        byEmployee[shift.employee_id] = {
          employee_id: shift.employee_id,
          employee_name: shift.employee_name,
          pay_rate: parseFloat(shift.pay_rate),
          shifts: [],
          total_hours: 0,
          gross_pay: 0,
        };
      }
      const rate = parseFloat(shift.pay_rate);
      const amount = parseFloat(shift.payroll_hours) * rate;
      byEmployee[shift.employee_id].shifts.push({ ...shift, effective_rate: rate, amount });
      byEmployee[shift.employee_id].total_hours += parseFloat(shift.payroll_hours);
      byEmployee[shift.employee_id].gross_pay += amount;
    }

    // Calculate deductions
    const result = Object.values(byEmployee).map(emp => {
      const cpp = emp.gross_pay * 0.0595;
      const ei = emp.gross_pay * 0.0163;
      const existingPayroll = null; // will be filled from DB
      return {
        ...emp,
        cpp_deduction: cpp,
        ei_deduction: ei,
        income_tax: 0,
        uber_misc_deduction: 0,
        net_pay: emp.gross_pay - cpp - ei,
      };
    });

    res.json(result);
  } catch (err) { next(err); }
});

// Save/update payroll entry
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { pay_period_id, employee_id, income_tax, uber_misc_deduction } = req.body;
    if (!pay_period_id || !employee_id) return res.status(400).json({ error: 'pay_period_id and employee_id required' });

    const period = await db('pay_periods').where({ id: pay_period_id }).first();
    if (!period) return res.status(404).json({ error: 'Pay period not found' });

    const employee = await db('users').where({ id: employee_id }).first();

    const shifts = await db('shifts')
      .where('employee_id', employee_id)
      .where('shift_date', '>=', period.start_date)
      .where('shift_date', '<=', period.end_date)
      .where('status', 'approved');

    let total_hours = 0;
    let gross_pay = 0;
    for (const s of shifts) {
      // payroll_hours embeds stat 1.5x multiplier — always use base pay_rate
      const rate = parseFloat(employee.pay_rate);
      gross_pay += parseFloat(s.payroll_hours) * rate;
      total_hours += parseFloat(s.payroll_hours);
    }

    const cpp_deduction = gross_pay * 0.0595;
    const ei_deduction = gross_pay * 0.0163;
    const itax = parseFloat(income_tax || 0);
    const uber = parseFloat(uber_misc_deduction || 0);
    const net_pay = gross_pay - cpp_deduction - ei_deduction - itax - uber;

    const [record] = await db('payroll')
      .insert({
        pay_period_id, employee_id,
        total_hours, gross_pay,
        cpp_deduction, ei_deduction,
        income_tax: itax,
        uber_misc_deduction: uber,
        net_pay,
      })
      .onConflict(['pay_period_id', 'employee_id'])
      .merge({ total_hours, gross_pay, cpp_deduction, ei_deduction, income_tax: itax, uber_misc_deduction: uber, net_pay, updated_at: new Date() })
      .returning('*');

    res.json(record);
  } catch (err) { next(err); }
});

// Export payroll summary PDF for a period
router.get('/export/:pay_period_id', requireAdmin, async (req, res, next) => {
  try {
    const { pay_period_id } = req.params;
    const period = await db('pay_periods').where({ id: pay_period_id }).first();
    if (!period) return res.status(404).json({ error: 'Pay period not found' });

    const payrollRecords = await db('payroll')
      .join('users', 'payroll.employee_id', 'users.id')
      .select(
        'payroll.id', 'payroll.employee_id', 'payroll.pay_period_id',
        'payroll.total_hours', 'payroll.gross_pay',
        'payroll.cpp_deduction', 'payroll.ei_deduction',
        'payroll.income_tax', 'payroll.uber_misc_deduction', 'payroll.net_pay',
        'users.name as employee_name', 'users.position as employee_position',
        'users.pay_rate'
      )
      .where('payroll.pay_period_id', pay_period_id);

    payrollRecords.sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''));

    const pdfBuffer = await generatePayrollSummaryPDF({ payrollRecords, payPeriod: period });
    const base64 = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    res.json({ pdf_url: base64, period });
  } catch (err) { next(err); }
});

// Generate paystubs (PDFs) for a period — auto-creates payroll records from shifts
router.post('/generate-paystubs/:pay_period_id', requireAdmin, async (req, res, next) => {
  try {
    const { pay_period_id } = req.params;
    const period = await db('pay_periods').where({ id: pay_period_id }).first();
    if (!period) return res.status(404).json({ error: 'Pay period not found' });

    // Find all approved shifts in the period
    const allShifts = await db('shifts')
      .where('shift_date', '>=', period.start_date)
      .where('shift_date', '<=', period.end_date)
      .where('status', 'approved');

    if (allShifts.length === 0) {
      return res.json({ success: true, generated: 0, paystubs: [] });
    }

    const employeeIds = [...new Set(allShifts.map(s => s.employee_id))];
    const results = [];

    for (const employee_id of employeeIds) {
      const employee = await db('users').where({ id: employee_id }).first();
      if (!employee) continue;

      const empShifts = allShifts.filter(s => s.employee_id === employee_id);
      let total_hours = 0, gross_pay = 0;
      for (const s of empShifts) {
        const rate = parseFloat(employee.pay_rate);
        total_hours += parseFloat(s.payroll_hours);
        gross_pay += parseFloat(s.payroll_hours) * rate;
      }

      const cpp_deduction = gross_pay * 0.0595;
      const ei_deduction = gross_pay * 0.0163;
      const existing = await db('payroll').where({ pay_period_id, employee_id }).first();
      const itax = parseFloat(existing?.income_tax || 0);
      const uber = parseFloat(existing?.uber_misc_deduction || 0);
      const net_pay = gross_pay - cpp_deduction - ei_deduction - itax - uber;

      const [record] = await db('payroll')
        .insert({ pay_period_id, employee_id, total_hours, gross_pay, cpp_deduction, ei_deduction, income_tax: itax, uber_misc_deduction: uber, net_pay })
        .onConflict(['pay_period_id', 'employee_id'])
        .merge({ total_hours, gross_pay, cpp_deduction, ei_deduction, net_pay, updated_at: new Date() })
        .returning('*');

      try {
        const empShiftsWithClient = await db('shifts')
          .join('clients', 'shifts.client_id', 'clients.id')
          .select('shifts.*', 'clients.name as client_name', 'clients.abbreviation as client_abbreviation')
          .where('shifts.employee_id', employee_id)
          .where('shifts.shift_date', '>=', period.start_date)
          .where('shifts.shift_date', '<=', period.end_date)
          .where('shifts.status', 'approved')
          .orderBy('shifts.shift_date');

        const pdfBuffer = await generatePaystubPDF({
          employee: {
            name: employee.name,
            position: employee.position,
            phone: employee.phone,
            pay_rate: employee.pay_rate,
          },
          payroll: record,
          shifts: empShiftsWithClient,
          payPeriod: period,
        });

        const filename = `paystub_${employee_id}_${period.start_date}.pdf`;
        const pdf_url = await uploadPDF(pdfBuffer, filename, 'paystubs');

        await db('payroll').where({ id: record.id }).update({ pdf_url, generated_at: new Date() });
        notifyPaystubReady(db, employee_id, pay_period_id).catch(console.error);
        results.push({ employee_id, name: employee.name, pdf_url });
      } catch (pdfErr) {
        console.error(`PDF generation failed for employee ${employee_id}:`, pdfErr.message);
        results.push({ employee_id, name: employee.name, pdf_url: null, error: pdfErr.message });
      }
    }

    res.json({ success: true, generated: results.length, paystubs: results });
  } catch (err) { next(err); }
});

module.exports = router;
