const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

async function getClientForUser(user) {
  if (!user.client_facility) return null;
  return db('clients').where({ name: user.client_facility }).first();
}

// List — clients see their own facility's requests, admins see all
router.get('/', async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    let query = db('shift_requests')
      .join('clients', 'shift_requests.client_id', 'clients.id')
      .select('shift_requests.*', 'clients.name as client_name', 'clients.abbreviation')
      .orderBy('shift_requests.created_at', 'desc');
    if (req.user.role === 'client') {
      const client = await getClientForUser(req.user);
      if (!client) return res.json([]);
      query = query.where('shift_requests.client_id', client.id);
    } else if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(await query);
  } catch (err) { next(err); }
});

// Create — client only
router.post('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'client') return res.status(403).json({ error: 'Access denied' });
    const client = await getClientForUser(req.user);
    if (!client) return res.status(404).json({ error: 'Facility not found' });
    const { requested_date, time_in, time_out, position, notes } = req.body;
    if (!requested_date || !position) {
      return res.status(400).json({ error: 'Date and position are required' });
    }
    const [request] = await db('shift_requests').insert({
      client_id: client.id,
      requested_date,
      time_in: time_in || null,
      time_out: time_out || null,
      position,
      notes: notes || '',
      status: 'pending',
      created_by: req.user.id,
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('*');
    res.status(201).json(request);
  } catch (err) { next(err); }
});

// Update status — admin only
router.patch('/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['pending', 'fulfilled', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await db('shift_requests').where({ id: req.params.id }).update({ status, updated_at: new Date() });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
