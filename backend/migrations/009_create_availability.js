exports.up = function (knex) {
  return knex.schema.createTable('availability', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('employee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.date('week_start').notNullable();
    t.specificType('available_days', 'text[]').notNullable().defaultTo('{}');
    t.text('notes').nullable();
    t.timestamps(true, true);
    t.unique(['employee_id', 'week_start']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('availability');
};
