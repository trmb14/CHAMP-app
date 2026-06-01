exports.up = function (knex) {
  return knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name').notNullable();
    t.string('email').notNullable().unique();
    t.string('password_hash').notNullable();
    t.enum('role', ['superadmin', 'admin', 'employee']).notNullable().defaultTo('employee');
    t.enum('position', ['PSW', 'RPN', 'HSKP', 'UCP', 'SRV', 'ADMIN']).nullable();
    t.decimal('pay_rate', 8, 2).defaultTo(0);
    t.string('phone').nullable();
    t.string('expo_push_token').nullable();
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
