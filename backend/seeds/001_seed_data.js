const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  await knex('invoice_line_items').del();
  await knex('invoices').del();
  await knex('payroll').del();
  await knex('shifts').del();
  await knex('billing_rates').del();
  await knex('pay_periods').del();
  await knex('clients').del();
  await knex('users').del();

  const hashedPassword = await bcrypt.hash('Champ2024!', 10);
  const employeePassword = await bcrypt.hash('Employee123!', 10);

  const users = await knex('users').insert([
    {
      name: 'Max Boursiquot',
      email: 'champottawacsi@gmail.com',
      password_hash: hashedPassword,
      role: 'superadmin',
      position: 'ADMIN',
      pay_rate: 20.00,
      phone: '613-824-5065',
      is_active: true,
    },
    {
      name: 'Joanne Smith',
      email: 'joanne@champ.ca',
      password_hash: employeePassword,
      role: 'employee',
      position: 'PSW',
      pay_rate: 19.00,
      phone: '613-555-0101',
      is_active: true,
    },
    {
      name: 'Daljit Singh',
      email: 'daljit@champ.ca',
      password_hash: employeePassword,
      role: 'employee',
      position: 'UCP',
      pay_rate: 24.00,
      phone: '613-555-0102',
      is_active: true,
    },
    {
      name: 'Lou Martin',
      email: 'lou@champ.ca',
      password_hash: employeePassword,
      role: 'employee',
      position: 'UCP',
      pay_rate: 24.00,
      phone: '613-555-0103',
      is_active: true,
    },
    {
      name: 'Rose Tremblay',
      email: 'rose@champ.ca',
      password_hash: employeePassword,
      role: 'employee',
      position: 'PSW',
      pay_rate: 22.00,
      phone: '613-555-0104',
      is_active: true,
    },
    {
      name: 'Beyene Tadesse',
      email: 'beyene@champ.ca',
      password_hash: employeePassword,
      role: 'employee',
      position: 'UCP',
      pay_rate: 30.00,
      phone: '613-555-0105',
      is_active: true,
    },
  ]).returning('*');

  const clients = await knex('clients').insert([
    {
      name: 'Island View Retirement Residence',
      abbreviation: 'IS',
      address: '30 Jack Crescent',
      city: 'Arnprior',
      province: 'ON',
      postal_code: 'H7S 3Y7',
      phone: '613-622-0002',
      contact_name: 'Adriana',
      is_active: true,
    },
    {
      name: "Shepherd's of Good Hope",
      abbreviation: 'SGH',
      address: '145 Castlefrank Rd',
      city: 'Kanata',
      province: 'ON',
      postal_code: 'K2L 3X9',
      phone: '613-831-3333',
      fax: '613-831-0153',
      is_active: true,
    },
    {
      name: 'Queenswood Villa',
      abbreviation: 'QW',
      address: '370 Kennedy Ln E',
      city: 'Ottawa',
      province: 'ON',
      postal_code: 'K1E 3X5',
      phone: '613-830-5168',
      fax: '613-837-4095',
      contact_name: 'Erin Albert',
      is_active: true,
    },
    {
      name: 'Alta Vista Retirement Community',
      abbreviation: 'AL',
      address: '751 Peter Morand Crest',
      city: 'Ottawa',
      province: 'ON',
      postal_code: 'K1G 6S9',
      phone: '613-739-0909',
      fax: '613-739-4667',
      is_active: true,
    },
    {
      name: 'Bearbrook Retirement Residence',
      abbreviation: 'BR',
      address: '2645 Innes Road',
      city: 'Ottawa',
      province: 'ON',
      postal_code: 'K1B 3J7',
      phone: '613-837-8720',
      contact_name: 'Preet',
      is_active: true,
    },
  ]).returning('*');

  const billingRatesData = [];
  for (const client of clients) {
    const positions = ['PSW', 'RPN', 'HSKP', 'UCP', 'SRV'];
    const baseRates = { PSW: 28.00, RPN: 38.00, HSKP: 24.00, UCP: 32.00, SRV: 26.00 };
    for (const pos of positions) {
      billingRatesData.push({
        client_id: client.id,
        position: pos,
        rate: baseRates[pos],
        is_statutory_double: false,
      });
    }
  }
  await knex('billing_rates').insert(billingRatesData);

  // Current pay period: Thu May 21 – Wed Jun 3, 2026
  await knex('pay_periods').insert([
    {
      start_date: '2026-05-21',
      end_date: '2026-06-03',
      status: 'open',
    },
  ]);

  // Sample shifts within the current pay period
  const employeeMap = {};
  for (const u of users) employeeMap[u.name.split(' ')[0]] = u.id;
  const clientMap = {};
  for (const c of clients) clientMap[c.abbreviation] = c.id;

  await knex('shifts').insert([
    {
      employee_id: employeeMap['Joanne'],
      client_id: clientMap['IS'],
      shift_date: '2026-05-22',
      day_of_week: 'Friday',
      time_in: '07:00',
      time_out: '15:00',
      payroll_hours: 7.5,
      invoice_hours: 8,
      position: 'PSW',
      is_statutory_holiday: false,
      status: 'approved',
    },
    {
      employee_id: employeeMap['Daljit'],
      client_id: clientMap['QW'],
      shift_date: '2026-05-26',
      day_of_week: 'Tuesday',
      time_in: '15:00',
      time_out: '23:00',
      payroll_hours: 7.5,
      invoice_hours: 8,
      position: 'UCP',
      is_statutory_holiday: false,
      status: 'approved',
    },
    {
      employee_id: employeeMap['Rose'],
      client_id: clientMap['BR'],
      shift_date: '2026-05-27',
      day_of_week: 'Wednesday',
      time_in: '07:00',
      time_out: '15:00',
      payroll_hours: 7.5,
      invoice_hours: 8,
      position: 'PSW',
      is_statutory_holiday: false,
      status: 'approved',
    },
    {
      employee_id: employeeMap['Lou'],
      client_id: clientMap['AL'],
      shift_date: '2026-05-28',
      day_of_week: 'Thursday',
      time_in: '07:00',
      time_out: '15:00',
      payroll_hours: 7.5,
      invoice_hours: 8,
      position: 'UCP',
      is_statutory_holiday: false,
      status: 'approved',
    },
    {
      employee_id: employeeMap['Beyene'],
      client_id: clientMap['SGH'],
      shift_date: '2026-05-29',
      day_of_week: 'Friday',
      time_in: '23:00',
      time_out: '07:00',
      payroll_hours: 7.5,
      invoice_hours: 8,
      position: 'UCP',
      is_statutory_holiday: false,
      status: 'approved',
    },
  ]);
};
