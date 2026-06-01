const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { sendExpoPushNotification } = require('../services/notificationService');

router.use(authenticate);

const USER_FIELDS = ['id', 'name', 'email', 'role', 'position', 'pay_rate', 'phone',
  'is_active', 'status', 'client_facility', 'created_at'];

// Get all users (admin+)
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { role, is_active, position } = req.query;
    let query = db('users').select(...USER_FIELDS);
    if (role) query = query.where({ role });
    if (is_active !== undefined) query = query.where({ is_active: is_active === 'true' });
    if (position) query = query.where({ position });
    const users = await query.orderBy('name');
    res.json(users);
  } catch (err) { next(err); }
});

// Get pending users (admin+)
router.get('/pending', requireAdmin, async (req, res, next) => {
  try {
    const users = await db('users')
      .select(...USER_FIELDS)
      .where({ status: 'pending' })
      .orderBy('created_at', 'desc');
    res.json(users);
  } catch (err) { next(err); }
});

// Approve a pending user (admin+)
router.patch('/:id/approve', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await db('users').where({ id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [updated] = await db('users').where({ id })
      .update({ is_active: true, status: 'active', updated_at: new Date() })
      .returning(USER_FIELDS);

    if (user.expo_push_token) {
      sendExpoPushNotification(
        [user.expo_push_token],
        'Account Approved',
        'Your CHAMP account has been approved. You can now log in.',
        { type: 'account_approved' }
      ).catch(console.error);
    }

    res.json(updated);
  } catch (err) { next(err); }
});

// Reject a pending user (admin+)
router.patch('/:id/reject', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await db('users').where({ id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [updated] = await db('users').where({ id })
      .update({ status: 'rejected', updated_at: new Date() })
      .returning(USER_FIELDS);

    if (user.expo_push_token) {
      sendExpoPushNotification(
        [user.expo_push_token],
        'Account Application Update',
        'Unfortunately, your CHAMP account application was not approved. Please contact CHAMP management for more information.',
        { type: 'account_rejected' }
      ).catch(console.error);
    }

    res.json(updated);
  } catch (err) { next(err); }
});

// Get single user
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'employee' && req.user.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const user = await db('users').select(...USER_FIELDS).where({ id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
});

// Create user (admin+)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password, role, position, pay_rate, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmin can create superadmin users' });
    }
    const existing = await db('users').where({ email: email.toLowerCase() }).first();
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const password_hash = await bcrypt.hash(password, 10);
    const [user] = await db('users').insert({
      name, email: email.toLowerCase(), password_hash,
      role: role || 'employee', position, pay_rate: pay_rate || 0, phone,
      status: 'active', is_active: true,
    }).returning(USER_FIELDS);
    res.status(201).json(user);
  } catch (err) { next(err); }
});

// Update user
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, position, pay_rate, phone, is_active, status, client_facility } = req.body;

    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmin can assign superadmin role' });
    }

    const updates = { name, position, pay_rate, phone, is_active, updated_at: new Date() };
    if (email) updates.email = email.toLowerCase();
    if (role) updates.role = role;
    if (status) updates.status = status;
    if (client_facility !== undefined) updates.client_facility = client_facility;
    if (password) updates.password_hash = await bcrypt.hash(password, 10);

    const [user] = await db('users').where({ id }).update(updates).returning(USER_FIELDS);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
});

// Deactivate (superadmin only)
router.delete('/:id', requireSuperAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await db('users').where({ id }).update({ is_active: false });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Get employee shift history
router.get('/:id/shifts', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'employee' && req.user.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const shifts = await db('shifts')
      .join('clients', 'shifts.client_id', 'clients.id')
      .select('shifts.*', 'clients.name as client_name', 'clients.abbreviation as client_abbreviation')
      .where('shifts.employee_id', id)
      .orderBy('shifts.shift_date', 'desc');
    res.json(shifts);
  } catch (err) { next(err); }
});

module.exports = router;
