exports.up = function (knex) {
  return knex.schema.createTable('billing_rates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE');
    t.enum('position', ['PSW', 'RPN', 'HSKP', 'UCP', 'SRV']).notNullable();
    t.decimal('rate', 8, 2).notNullable();
    t.boolean('is_statutory_double').defaultTo(false);
    t.timestamps(true, true);
    t.unique(['client_id', 'position']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('billing_rates');
};
