"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.query(`
      ALTER TABLE transactions
      ADD COLUMN IF NOT EXISTS accounting_date DATE;
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_effective_month
      ON transactions (user_id, COALESCE(accounting_date, "timestamp"));
    `);
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.query(`
      DROP INDEX IF EXISTS idx_transactions_user_effective_month;
    `);
    await sequelize.query(`
      ALTER TABLE transactions DROP COLUMN IF EXISTS accounting_date;
    `);
  },
};
