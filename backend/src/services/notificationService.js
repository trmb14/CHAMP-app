const https = require('https');

async function sendExpoPushNotification(pushTokens, title, body, data = {}) {
  const messages = pushTokens
    .filter(token => token && token.startsWith('ExponentPushToken'))
    .map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }));

  if (messages.length === 0) return;

  const payload = JSON.stringify(messages);
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(process.env.EXPO_ACCESS_TOKEN && {
          'Authorization': `Bearer ${process.env.EXPO_ACCESS_TOKEN}`,
        }),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function notifyShiftAssigned(db, shiftId) {
  const shift = await db('shifts')
    .join('users', 'shifts.employee_id', 'users.id')
    .join('clients', 'shifts.client_id', 'clients.id')
    .select('users.expo_push_token', 'users.name', 'clients.name as client_name', 'shifts.shift_date', 'shifts.time_in', 'shifts.time_out')
    .where('shifts.id', shiftId)
    .first();

  if (shift?.expo_push_token) {
    await sendExpoPushNotification(
      [shift.expo_push_token],
      'New Shift Assigned',
      `You have a new shift at ${shift.client_name} on ${shift.shift_date} (${shift.time_in}–${shift.time_out})`,
      { type: 'new_shift', shiftId }
    );
  }
}

async function notifyPaystubReady(db, employeeId, payPeriodId) {
  const user = await db('users').where({ id: employeeId }).first();
  if (user?.expo_push_token) {
    await sendExpoPushNotification(
      [user.expo_push_token],
      'Paystub Ready',
      'Your paystub for the latest pay period is now available.',
      { type: 'paystub_ready', payPeriodId }
    );
  }
}

async function notifyShiftClaimRequest(db, shiftId, employee) {
  const shift = await db('shifts')
    .join('clients', 'shifts.client_id', 'clients.id')
    .select('shifts.*', 'clients.name as client_name')
    .where('shifts.id', shiftId)
    .first();

  if (!shift) return;

  const admins = await db('users').where({ role: 'admin', is_active: true });
  const tokens = admins.map(a => a.expo_push_token).filter(Boolean);
  if (tokens.length === 0) return;

  await sendExpoPushNotification(
    tokens,
    'Shift Claim Request',
    `${employee.name} wants to claim the ${shift.position} shift at ${shift.client_name} on ${shift.shift_date}`,
    { type: 'shift_claim', shiftId, employeeId: employee.id }
  );
}

module.exports = { sendExpoPushNotification, notifyShiftAssigned, notifyPaystubReady, notifyShiftClaimRequest };
