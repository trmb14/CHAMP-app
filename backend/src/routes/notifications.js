const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendExpoPushNotification } = require('../services/notificationService');
const db = require('../config/database');

router.use(authenticate);

router.post('/send', requireAdmin, async (req, res, next) => {
  try {
    const { employee_ids, title, body, data } = req.body;
    const users = await db('users')
      .whereIn('id', employee_ids)
      .whereNotNull('expo_push_token')
      .pluck('expo_push_token');
    await sendExpoPushNotification(users, title, body, data);
    res.json({ success: true, sent: users.length });
  } catch (err) { next(err); }
});

module.exports = router;
