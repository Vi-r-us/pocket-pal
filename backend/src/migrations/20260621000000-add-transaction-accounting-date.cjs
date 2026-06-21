"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.query(`
      ALTER TABLE transactions
      ADD COLUMN IF NOT EXISTS accounting_date DATE;
    `);
    // Index on accounting_date alone; an expression index on
    // COALESCE(accounting_date, "timestamp") is rejected by Postgres because the
    // implicit timestamptz cast is not IMMUTABLE. The existing (user_id, timestamp)
    // index still serves the fallback path.
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_accounting_date
      ON transactions (user_id, accounting_date);
    `);
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.query(`
      DROP INDEX IF EXISTS idx_transactions_user_accounting_date;
    `);
    await sequelize.query(`
      ALTER TABLE transactions DROP COLUMN IF EXISTS accounting_date;
    `);
  },
};
