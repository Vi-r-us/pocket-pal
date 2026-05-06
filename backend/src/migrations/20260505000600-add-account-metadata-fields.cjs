"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.query(`
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS opening_balance_minor BIGINT NOT NULL DEFAULT 0;
    `);
    await sequelize.query(`
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS credit_limit_minor BIGINT;
    `);
    await sequelize.query(`
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS statement_day SMALLINT;
    `);
    await sequelize.query(`
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS payment_due_day SMALLINT;
    `);
    await sequelize.query(`
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS institution_name VARCHAR(120);
    `);
    await sequelize.query(`
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS account_number_last4 VARCHAR(4);
    `);
    await sequelize.query(`
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);
    await sequelize.query(`
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS icon_key VARCHAR(64);
    `);
    await sequelize.query(`
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
    `);
    await sequelize.query(`
      ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS include_in_net_worth BOOLEAN NOT NULL DEFAULT TRUE;
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_accounts_user_display_order
      ON accounts (user_id, display_order);
    `);
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.query(`
      DROP INDEX IF EXISTS idx_accounts_user_display_order;
    `);
    await sequelize.query(`
      ALTER TABLE accounts DROP COLUMN IF EXISTS include_in_net_worth;
    `);
    await sequelize.query(`
      ALTER TABLE accounts DROP COLUMN IF EXISTS display_order;
    `);
    await sequelize.query(`
      ALTER TABLE accounts DROP COLUMN IF EXISTS icon_key;
    `);
    await sequelize.query(`
      ALTER TABLE accounts DROP COLUMN IF EXISTS notes;
    `);
    await sequelize.query(`
      ALTER TABLE accounts DROP COLUMN IF EXISTS account_number_last4;
    `);
    await sequelize.query(`
      ALTER TABLE accounts DROP COLUMN IF EXISTS institution_name;
    `);
    await sequelize.query(`
      ALTER TABLE accounts DROP COLUMN IF EXISTS payment_due_day;
    `);
    await sequelize.query(`
      ALTER TABLE accounts DROP COLUMN IF EXISTS statement_day;
    `);
    await sequelize.query(`
      ALTER TABLE accounts DROP COLUMN IF EXISTS credit_limit_minor;
    `);
    await sequelize.query(`
      ALTER TABLE accounts DROP COLUMN IF EXISTS opening_balance_minor;
    `);
  },
};
