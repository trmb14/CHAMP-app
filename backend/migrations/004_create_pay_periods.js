exports.up = function (knex) {
  return knex.schema.createTable('pay_periods', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.enum('status', ['open', 'closed', 'paid']).notNullable().defaultTo('open');
    t.timestamps(true, true);
    t.unique(['start_date', 'end_date']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('pay_periods');
};
