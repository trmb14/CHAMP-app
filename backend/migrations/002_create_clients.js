exports.up = function (knex) {
  return knex.schema.createTable('clients', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name').notNullable();
    t.string('abbreviation', 10).notNullable().unique();
    t.string('address').nullable();
    t.string('city').nullable();
    t.string('province').defaultTo('ON');
    t.string('postal_code').nullable();
    t.string('phone').nullable();
    t.string('fax').nullable();
    t.string('contact_name').nullable();
    t.string('email').nullable();
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('clients');
};
