const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { generateInvoicePDF } = require('../services/pdfService');
const { uploadPDF } = require('../services/storageService');
const { buildInvoiceNumber, getInvoiceWeekForDate } = require('../utils/syncRecords');

router.use(authenticate);

function r2(n) { return Math.round(n * 100) / 100; }

// Builds split line-item rows for a shift.
// Stat shifts produce 2 rows (regular + STATUTORY premium).
// Overnight stat produces 3 rows (pre-midnight regular, post-midnight regular, post-midnight STATUTORY).
function buildLineItems(shift, baseRate) {
  if (!shift.is_statutory_holiday) {
    return [{
      shift_id: shift.id,
      date_of_service: shift.shift_date,
      shift_hours: parseFloat(shift.invoice_hours),
      position: shift.position,
      time_in: shift.time_in,
      time_out: shift.time_out,
      rate: baseRate,
      total: r2(parseFloat(shift.invoice_hours) * baseRate),
      is_statutory: false,
    }];
  }

  const [inH, inM] = shift.time_in.split(':').map(Number);
  const [outH, outM] = shift.time_out.split(':').map(Number);
  const inMins = inH * 60 + inM;
  const outMins = outH * 60 + outM;
  const isOvernight = outMins <= inMins;

  if (!isOvernight) {
    // Full stat day: regular row + statutory premium row
    const hours = parseFloat(shift.invoice_hours);
    return [
      { shift_id: shift.id, date_of_service: shift.shift_date, shift_hours: hours, position: shift.position, time_in: shift.time_in, time_out: shift.time_out, rate: baseRate, total: r2(hours * baseRate), is_statutory: false },
      { shift_id: shift.id, date_of_service: shift.shift_date, shift_hours: hours, position: 'STATUTORY', time_in: shift.time_in, time_out: shift.time_out, rate: baseRate, total: r2(hours * baseRate), is_statutory: true },
    ];
  }

  // Overnight stat: split at midnight
  const preHours = r2((1440 - inMins) / 60);
  const postHours = r2(outMins / 60);
  const nextDay = new Date(shift.shift_date + 'T12:00:00');
  nextDay.setDate(nextDay.getDate() + 1);
  const statDate = nextDay.toISOString().split('T')[0];

  return [
    { shift_id: shift.id, date_of_service: shift.shift_date, shift_hours: preHours, position: shift.position, time_in: shift.time_in, time_out: '00:00', rate: baseRate, total: r2(preHours * baseRate), is_statutory: false },
    { shift_id: shift.id, date_of_service: statDate, shift_hours: postHours, position: shift.position, time_in: '00:00', time_out: shift.time_out, rate: baseRate, total: r2(postHours * baseRate), is_statutory: false },
    { shift_id: shift.id, date_of_service: statDate, shift_hours: postHours, position: 'STATUTORY', time_in: '00:00', time_out: shift.time_out, rate: baseRate, total: r2(postHours * baseRate), is_statutory: true },
  ];
}

// Invoice date = Monday immediately after the week ends (week_end is always Sunday)
function getInvoiceDate(week_end) {
  const d = new Date(week_end + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function addInvoiceDate(invoice) {
  if (!invoice) return invoice;
  return { ...invoice, invoice_date: getInvoiceDate(invoice.week_end) };
}

// Resolve the clients row for the current client-role user
async function getClientForUser(user) {
  if (!user.client_facility) return null;
  return db('clients').where({ name: user.client_facility }).first();
}

// Middleware: admin passes through; client must own the invoice
async function canAccessInvoice(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'superadmin') return next();
  if (req.user.role !== 'client') return res.status(403).json({ error: 'Access denied' });

  const client = await getClientForUser(req.user);
  if (!client) return res.status(403).json({ error: 'No facility associated with your account' });

  const invoice = await db('invoices').where({ id: req.params.id }).first();
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.client_id !== client.id) return res.status(403).json({ error: 'Access denied' });

  req.resolvedClient = client;
  req.resolvedInvoice = invoice;
  next();
}

router.get('/', async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    let clientId = req.query.client_id;

    // Client role: scope to their own facility only
    if (req.user.role === 'client') {
      const client = await getClientForUser(req.user);
      if (!client) return res.json([]);
      clientId = client.id;
    } else if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { status, week_start } = req.query;
    let query = db('invoices')
      .join('clients', 'invoices.client_id', 'clients.id')
      .select('invoices.*', 'clients.name as client_name', 'clients.abbreviation');
    if (clientId) query = query.where('invoices.client_id', clientId);
    if (status) query = query.where('invoices.status', status);
    if (week_start) query = query.where('invoices.week_start', week_start);
    const invoices = await query.orderBy('invoices.week_start', 'desc');
    res.json(invoices.map(addInvoiceDate));
  } catch (err) { next(err); }
});

router.get('/:id', canAccessInvoice, async (req, res, next) => {
  try {
    const invoice = await db('invoices')
      .join('clients', 'invoices.client_id', 'clients.id')
      .select('invoices.*', 'clients.name as client_name', 'clients.abbreviation',
        'clients.address', 'clients.city', 'clients.province', 'clients.postal_code',
        'clients.phone', 'clients.fax', 'clients.contact_name', 'clients.billing_email')
      .where('invoices.id', req.params.id)
      .first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const lineItems = await db('invoice_line_items')
      .where({ invoice_id: invoice.id })
      .orderBy('date_of_service');
    res.json({ ...addInvoiceDate(invoice), line_items: lineItems });
  } catch (err) { next(err); }
});

// Preview for a week (admin only)
router.get('/preview/:week_start', requireAdmin, async (req, res, next) => {
  try {
    const { week_start } = req.params;
    const { week_end } = getInvoiceWeekForDate(week_start);
    const invoice_date = getInvoiceDate(week_end);

    const shifts = await db('shifts')
      .join('clients', 'shifts.client_id', 'clients.id')
      .join('users', 'shifts.employee_id', 'users.id')
      .select('shifts.*', 'clients.name as client_name', 'users.name as employee_name')
      .where('shifts.shift_date', '>=', week_start)
      .where('shifts.shift_date', '<=', week_end)
      .where('shifts.status', 'approved')
      .orderBy('shifts.shift_date');

    const byClient = {};
    for (const s of shifts) {
      const cid = s.client_id;
      if (!byClient[cid]) {
        byClient[cid] = { client_id: cid, client_name: s.client_name, abbreviation: s.client_abbreviation, shifts: [] };
      }
      byClient[cid].shifts.push(s);
    }

    const previews = [];
    for (const [cid, data] of Object.entries(byClient)) {
      const rates = await db('billing_rates').where({ client_id: cid }).select('position', 'rate');
      const rateMap = Object.fromEntries(rates.map(r => [r.position, parseFloat(r.rate)]));

      let subtotal = 0;
      const lineItems = [];
      for (const s of data.shifts) {
        const baseRate = rateMap[s.position] || 0;
        const items = buildLineItems(s, baseRate);
        lineItems.push(...items);
        subtotal += items.reduce((sum, i) => sum + i.total, 0);
      }

      const invoice_number = buildInvoiceNumber(data.abbreviation, data.shifts);
      const hst_amount = subtotal * 0.13;
      previews.push({
        ...data, invoice_number, invoice_date, line_items: lineItems,
        subtotal, hst_amount, total_due: subtotal + hst_amount, week_start, week_end,
      });
    }

    res.json(previews);
  } catch (err) { next(err); }
});

// Generate invoice for one client (admin only)
router.post('/generate', requireAdmin, async (req, res, next) => {
  try {
    const { client_id, week_start } = req.body;
    if (!client_id || !week_start) return res.status(400).json({ error: 'client_id and week_start required' });

    const { week_end } = getInvoiceWeekForDate(week_start);
    const invoice_date = getInvoiceDate(week_end);

    const client = await db('clients').where({ id: client_id }).first();
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const shifts = await db('shifts')
      .where({ client_id })
      .where('shift_date', '>=', week_start)
      .where('shift_date', '<=', week_end)
      .where('status', 'approved')
      .orderBy('shift_date');

    if (shifts.length === 0) return res.status(400).json({ error: 'No approved shifts for this week' });

    const rates = await db('billing_rates').where({ client_id }).select('position', 'rate');
    const rateMap = Object.fromEntries(rates.map(r => [r.position, parseFloat(r.rate)]));

    let subtotal = 0;
    const lineItemsData = [];
    for (const s of shifts) {
      const baseRate = rateMap[s.position] || 0;
      const items = buildLineItems(s, baseRate);
      lineItemsData.push(...items);
      subtotal += items.reduce((sum, i) => sum + i.total, 0);
    }

    const hst_amount = subtotal * 0.13;
    const total_due = subtotal + hst_amount;
    const invoice_number = buildInvoiceNumber(client.abbreviation, shifts);

    let invoice = await db('invoices').where({ client_id, week_start }).first();
    if (invoice) {
      [invoice] = await db('invoices').where({ id: invoice.id })
        .update({ invoice_number, subtotal, hst_amount, total_due, generated_at: new Date(), updated_at: new Date() })
        .returning('*');
      await db('invoice_line_items').where({ invoice_id: invoice.id }).del();
    } else {
      [invoice] = await db('invoices').insert({
        client_id, week_start, week_end, invoice_number,
        subtotal, hst_amount, total_due, status: 'draft', generated_at: new Date(),
      }).returning('*');
    }

    await db('invoice_line_items').insert(lineItemsData.map(li => ({ ...li, invoice_id: invoice.id })));

    const pdfBuffer = await generateInvoicePDF({
      invoice: { ...invoice, week_start, week_end, invoice_date },
      client,
      lineItems: lineItemsData,
    });

    const filename = `${invoice_number}.pdf`;
    const pdf_url = await uploadPDF(pdfBuffer, filename, 'invoices');
    await db('invoices').where({ id: invoice.id }).update({ pdf_url });
    await db('shifts').whereIn('id', shifts.map(s => s.id)).update({ status: 'invoiced', updated_at: new Date() });

    res.json({ ...addInvoiceDate({ ...invoice, pdf_url }), line_items: lineItemsData });
  } catch (err) { next(err); }
});

// Generate all invoices for a week (admin only)
router.post('/generate-all', requireAdmin, async (req, res, next) => {
  try {
    const { week_start } = req.body;
    if (!week_start) return res.status(400).json({ error: 'week_start required' });

    const { week_end } = getInvoiceWeekForDate(week_start);

    const clientIds = await db('shifts')
      .where('shift_date', '>=', week_start)
      .where('shift_date', '<=', week_end)
      .where('status', 'approved')
      .distinct('client_id')
      .pluck('client_id');

    const results = [];
    for (const client_id of clientIds) {
      try {
        const client = await db('clients').where({ id: client_id }).first();
        if (!client) continue;

        const invoice_date = getInvoiceDate(week_end);
        const shifts = await db('shifts')
          .where({ client_id })
          .where('shift_date', '>=', week_start)
          .where('shift_date', '<=', week_end)
          .where('status', 'approved')
          .orderBy('shift_date');

        if (shifts.length === 0) continue;

        const rates = await db('billing_rates').where({ client_id }).select('position', 'rate');
        const rateMap = Object.fromEntries(rates.map(r => [r.position, parseFloat(r.rate)]));

        let subtotal = 0;
        const lineItemsData = [];
        for (const s of shifts) {
          const baseRate = rateMap[s.position] || 0;
          const items = buildLineItems(s, baseRate);
          lineItemsData.push(...items);
          subtotal += items.reduce((sum, i) => sum + i.total, 0);
        }

        const hst_amount = subtotal * 0.13;
        const total_due = subtotal + hst_amount;
        const invoice_number = buildInvoiceNumber(client.abbreviation, shifts);

        let invoice = await db('invoices').where({ client_id, week_start }).first();
        if (invoice) {
          [invoice] = await db('invoices').where({ id: invoice.id })
            .update({ invoice_number, subtotal, hst_amount, total_due, generated_at: new Date(), updated_at: new Date() })
            .returning('*');
          await db('invoice_line_items').where({ invoice_id: invoice.id }).del();
        } else {
          [invoice] = await db('invoices').insert({
            client_id, week_start, week_end, invoice_number,
            subtotal, hst_amount, total_due, status: 'draft', generated_at: new Date(),
          }).returning('*');
        }

        await db('invoice_line_items').insert(lineItemsData.map(li => ({ ...li, invoice_id: invoice.id })));

        const pdfBuffer = await generateInvoicePDF({
          invoice: { ...invoice, week_start, week_end, invoice_date },
          client, lineItems: lineItemsData,
        });

        const filename = `${invoice_number}.pdf`;
        const pdf_url = await uploadPDF(pdfBuffer, filename, 'invoices');
        await db('invoices').where({ id: invoice.id }).update({ pdf_url });
        await db('shifts').whereIn('id', shifts.map(s => s.id)).update({ status: 'invoiced', updated_at: new Date() });

        results.push({ ...addInvoiceDate({ ...invoice, pdf_url }), line_items: lineItemsData });
      } catch (err) {
        console.error(`Invoice generation failed for client ${client_id}:`, err.message);
      }
    }

    res.json({ success: true, generated: results.length, invoices: results });
  } catch (err) { next(err); }
});

// Update invoice status — admin: any status; client: can mark as paid for their own invoice
router.patch('/:id/status', canAccessInvoice, async (req, res, next) => {
  try {
    const { status } = req.body;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    // Clients may only set status to 'paid'
    if (!isAdmin && status !== 'paid') {
      return res.status(403).json({ error: 'Clients may only mark invoices as paid' });
    }

    const [invoice] = await db('invoices').where({ id: req.params.id })
      .update({ status, updated_at: new Date() }).returning('*');
    res.json(addInvoiceDate(invoice));
  } catch (err) { next(err); }
});

module.exports = router;
