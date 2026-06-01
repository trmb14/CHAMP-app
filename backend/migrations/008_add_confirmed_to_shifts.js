exports.up = function (knex) {
  return knex.schema.alterTable('shifts', (t) => {
    t.boolean('confirmed').defaultTo(false);
    t.timestamp('confirmed_at').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('shifts', (t) => {
    t.dropColumn('confirmed');
    t.dropColumn('confirmed_at');
  });
};
