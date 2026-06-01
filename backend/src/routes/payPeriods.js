const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getCurrentPayPeriod } = require('../utils/payPeriod');
const { generatePayrollSummaryPDF } = require('../services/pdfService');
const { uploadPDF } = require('../services/storageService');

router.use(authenticate);
router.use(requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const periods = await db('pay_periods').orderBy('start_date', 'desc');
    res.json(periods);
  } catch (err) { next(err); }
});

router.get('/current', async (req, res, next) => {
  try {
    const { start_date, end_date } = getCurrentPayPeriod();
    let period = await db('pay_periods').where({ start_date, end_date }).first();
    if (!period) {
      [period] = await db('pay_periods').insert({ start_date, end_date, status: 'open' }).returning('*');
    }
    res.json(period);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const period = await db('pay_periods').where({ id: req.params.id }).first();
    if (!period) return res.status(404).json({ error: 'Pay period not found' });
    res.json(period);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.body;
    if (!start_date || !end_date) return res.status(400).json({ error: 'start_date and end_date required' });
    const [period] = await db('pay_periods').insert({ start_date, end_date, status: 'open' }).returning('*');
    res.status(201).json(period);
  } catch (err) { next(err); }
});

router.patch('/:id/close', async (req, res, next) => {
  try {
    const { id } = req.params;

    const period = await db('pay_periods').where({ id }).first();
    if (!period) return res.status(404).json({ error: 'Pay period not found' });

    // Fetch payroll records with employee info for PDF
    const payrollRecords = await db('payroll')
      .join('users', 'payroll.employee_id', 'users.id')
      .select(
        'payroll.*',
        'users.name as employee_name',
        'users.position as employee_position',
        'users.pay_rate'
      )
      .where('payroll.pay_period_id', id);

    payrollRecords.sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''));

    // Compute summary totals
    const total_gross = payrollRecords.reduce((s, r) => s + parseFloat(r.gross_pay || 0), 0);
    const total_net = payrollRecords.reduce((s, r) => s + parseFloat(r.net_pay || 0), 0);
    const employee_count = payrollRecords.length;

    // Generate and upload summary PDF (don't fail close if PDF fails)
    let summary_pdf_url = null;
    try {
      if (payrollRecords.length > 0) {
        const pdfBuffer = await generatePayrollSummaryPDF({ payrollRecords, payPeriod: period });
        const filename = `payroll_summary_${period.start_date}.pdf`;
        summary_pdf_url = await uploadPDF(pdfBuffer, filename, 'payroll-summaries');
      }
    } catch (pdfErr) {
      console.error('Payroll summary PDF generation failed:', pdfErr.message);
    }

    const [updated] = await db('pay_periods').where({ id })
      .update({
        status: 'closed',
        summary_pdf_url,
        total_gross: total_gross.toFixed(2),
        total_net: total_net.toFixed(2),
        employee_count,
        updated_at: new Date(),
      })
      .returning('*');

    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
