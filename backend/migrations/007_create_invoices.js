exports.up = function (knex) {
  return knex.schema
    .createTable('invoices', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE');
      t.date('week_start').notNullable();
      t.date('week_end').notNullable();
      t.string('invoice_number', 30).notNullable().unique();
      t.decimal('subtotal', 10, 2).defaultTo(0);
      t.decimal('hst_amount', 10, 2).defaultTo(0);
      t.decimal('total_due', 10, 2).defaultTo(0);
      t.enum('status', ['draft', 'sent', 'paid']).defaultTo('draft');
      t.timestamp('generated_at').nullable();
      t.string('pdf_url').nullable();
      t.timestamps(true, true);
    })
    .createTable('invoice_line_items', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('invoice_id').notNullable().references('id').inTable('invoices').onDelete('CASCADE');
      t.uuid('shift_id').nullable().references('id').inTable('shifts').onDelete('SET NULL');
      t.date('date_of_service').notNullable();
      t.decimal('shift_hours', 5, 2).notNullable();
      t.enum('position', ['PSW', 'RPN', 'HSKP', 'UCP', 'SRV']).notNullable();
      t.time('time_in').notNullable();
      t.time('time_out').notNullable();
      t.decimal('rate', 8, 2).notNullable();
      t.decimal('total', 10, 2).notNullable();
      t.boolean('is_statutory').defaultTo(false);
      t.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('invoice_line_items')
    .dropTableIfExists('invoices');
};
