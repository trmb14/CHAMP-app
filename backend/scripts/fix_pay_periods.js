require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../src/config/database');

async function main() {
  // Delete payroll first, then pay_periods (FK constraint)
  await db('payroll').whereNotNull('id').del();
  await db('pay_periods').whereNotNull('id').del();
  await db('pay_periods').insert([
    { start_date: '2026-05-21', end_date: '2026-06-03', status: 'open' },
  ]);
  console.log('Done — pay periods reset to May 21 – Jun 3, 2026');
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
