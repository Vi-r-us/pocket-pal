"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_timestamp
      ON transactions(user_id, "timestamp" DESC);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_amount_minor
      ON transactions(user_id, amount_minor);
    `);
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.query(`
      DROP INDEX IF EXISTS idx_transactions_user_amount_minor;
    `);

    await sequelize.query(`
      DROP INDEX IF EXISTS idx_transactions_user_timestamp;
    `);
  },
};
