exports.up = function (knex) {
  return knex.schema.createTable('payroll', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('pay_period_id').notNullable().references('id').inTable('pay_periods').onDelete('CASCADE');
    t.uuid('employee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.decimal('total_hours', 7, 2).defaultTo(0);
    t.decimal('gross_pay', 10, 2).defaultTo(0);
    t.decimal('cpp_deduction', 10, 2).defaultTo(0);
    t.decimal('ei_deduction', 10, 2).defaultTo(0);
    t.decimal('income_tax', 10, 2).defaultTo(0);
    t.decimal('uber_misc_deduction', 10, 2).defaultTo(0);
    t.decimal('net_pay', 10, 2).defaultTo(0);
    t.timestamp('generated_at').nullable();
    t.string('pdf_url').nullable();
    t.timestamps(true, true);
    t.unique(['pay_period_id', 'employee_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('payroll');
};
