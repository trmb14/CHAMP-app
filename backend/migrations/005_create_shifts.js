exports.up = function (knex) {
  return knex.schema.createTable('shifts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('employee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE');
    t.date('shift_date').notNullable();
    t.string('day_of_week', 10).nullable();
    t.time('time_in').notNullable();
    t.time('time_out').notNullable();
    t.decimal('payroll_hours', 5, 2).notNullable();
    t.decimal('invoice_hours', 5, 2).notNullable();
    t.enum('position', ['PSW', 'RPN', 'HSKP', 'UCP', 'SRV']).notNullable();
    t.boolean('is_statutory_holiday').defaultTo(false);
    t.text('notes').nullable();
    t.enum('status', ['pending', 'approved', 'invoiced']).defaultTo('pending');
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('shifts');
};
