const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');

router.use(authenticate);
router.use(requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const clients = await db('clients').orderBy('name');
    res.json(clients);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const client = await db('clients').where({ id: req.params.id }).first();
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const rates = await db('billing_rates').where({ client_id: client.id }).orderBy('position');
    res.json({ ...client, billing_rates: rates });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, abbreviation, address, city, province, postal_code, phone, fax, contact_name, email, billing_email } = req.body;
    if (!name || !abbreviation) return res.status(400).json({ error: 'Name and abbreviation required' });
    const [client] = await db('clients').insert({
      name, abbreviation: abbreviation.toUpperCase(), address, city,
      province: province || 'ON', postal_code, phone, fax, contact_name, email, billing_email,
    }).returning('*');
    res.status(201).json(client);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, abbreviation, address, city, province, postal_code, phone, fax, contact_name, email, billing_email, is_active } = req.body;
    const [client] = await db('clients').where({ id: req.params.id })
      .update({ name, abbreviation, address, city, province, postal_code, phone, fax, contact_name, email, billing_email, is_active, updated_at: new Date() })
      .returning('*');
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) { next(err); }
});

// Billing rates
router.get('/:id/rates', async (req, res, next) => {
  try {
    const rates = await db('billing_rates').where({ client_id: req.params.id }).orderBy('position');
    res.json(rates);
  } catch (err) { next(err); }
});

router.put('/:id/rates', requireSuperAdmin, async (req, res, next) => {
  try {
    const { rates } = req.body; // [{ position, rate }]
    if (!Array.isArray(rates)) return res.status(400).json({ error: 'rates must be an array' });

    for (const r of rates) {
      await db('billing_rates')
        .insert({ client_id: req.params.id, position: r.position, rate: r.rate })
        .onConflict(['client_id', 'position'])
        .merge({ rate: r.rate, updated_at: new Date() });
    }
    const updated = await db('billing_rates').where({ client_id: req.params.id }).orderBy('position');
    res.json(updated);
  } catch (err) { next(err); }
});

// Invoice history for client
router.get('/:id/invoices', async (req, res, next) => {
  try {
    const invoices = await db('invoices')
      .where({ client_id: req.params.id })
      .orderBy('week_start', 'desc');
    res.json(invoices);
  } catch (err) { next(err); }
});

module.exports = router;
