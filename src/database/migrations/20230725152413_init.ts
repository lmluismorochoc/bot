import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema
    .createTable('companies', function (table) {
      table.increments('id_company');
      table.string('company_name');
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('company_configs', function (table) {
      table.increments('id_company_config');
      table.string('config');
      table.string('value', 250);
      table.jsonb('json_value');
      table.integer('company_id').unsigned().notNullable();
      table.foreign('company_id').references('id_company').inTable('companies');
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('users', function (table) {
      table.increments('id_user');
      table.string('name');
      table.string('chat_id', 100);
      table.integer('company_id').unsigned().notNullable();
      table.foreign('company_id').references('id_company').inTable('companies');
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('query_packages', function (table) {
      table.increments('id_query_package');
      table.integer('company_id').unsigned().notNullable();
      table.foreign('company_id').references('id_company').inTable('companies');
      table.integer('initial_count');
      table.boolean('completed').defaultTo(false);
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('query_request', function (table) {
      table.increments('id_query_request');
      table.integer('user_id').unsigned().notNullable();
      table.foreign('user_id').references('id_user').inTable('users');
      table.integer('query_package_id').unsigned().notNullable();
      table
        .foreign('query_package_id')
        .references('id_query_package')
        .inTable('query_packages');
      table.jsonb('request');
      table.jsonb('response');
      table.boolean('successful').defaultTo(false);
      table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
  // empty function
}
