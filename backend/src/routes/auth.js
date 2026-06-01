const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await db('users').where({ email: email.toLowerCase().trim() }).first();
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Check account status before password (gives specific error messages)
    if (user.status === 'pending') {
      return res.status(401).json({ error: 'Your account is pending approval. Please contact CHAMP management.' });
    }
    if (user.status === 'rejected') {
      return res.status(401).json({ error: 'Your account application was not approved. Please contact CHAMP management.' });
    }
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is inactive. Please contact CHAMP management.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password_hash, ...userOut } = user;
    res.json({ token, user: userOut });
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, confirm_password, role, position, client_facility } = req.body;

    if (!first_name?.trim()) return res.status(400).json({ error: 'First name is required' });
    if (!last_name?.trim()) return res.status(400).json({ error: 'Last name is required' });
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
    if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    if (!password) return res.status(400).json({ error: 'Password is required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (password !== confirm_password) return res.status(400).json({ error: 'Passwords do not match' });
    if (!['employee', 'client'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (role === 'employee' && !position) return res.status(400).json({ error: 'Position is required for employees' });
    if (role === 'client' && !client_facility) return res.status(400).json({ error: 'Facility selection is required' });

    const existing = await db('users').where({ email: email.toLowerCase().trim() }).first();
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const name = `${first_name.trim()} ${last_name.trim()}`;

    const [user] = await db('users').insert({
      name,
      email: email.toLowerCase().trim(),
      password_hash,
      role,
      position: role === 'employee' ? position : null,
      client_facility: role === 'client' ? client_facility : null,
      pay_rate: 0,
      is_active: false,
      status: 'pending',
    }).returning(['id', 'name', 'email', 'role', 'position', 'client_facility', 'status', 'is_active', 'created_at']);

    res.status(201).json({ user, message: 'Account created and pending approval' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res) => {
  const { password_hash, ...user } = req.user;
  res.json(user);
});

router.post('/refresh', authenticate, async (req, res) => {
  const token = jwt.sign(
    { id: req.user.id, role: req.user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  res.json({ token });
});

router.patch('/push-token', authenticate, async (req, res, next) => {
  try {
    const { expo_push_token } = req.body;
    await db('users').where({ id: req.user.id }).update({ expo_push_token });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
