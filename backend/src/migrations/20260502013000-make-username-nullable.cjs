"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.query(`
      ALTER TABLE users
      ALTER COLUMN username DROP NOT NULL;
    `);

    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users(username);
    `);
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    await sequelize.query(`
      UPDATE users
      SET username = CONCAT('user_', user_id)
      WHERE username IS NULL;
    `);

    await sequelize.query(`
      ALTER TABLE users
      ALTER COLUMN username SET NOT NULL;
    `);
  },
};
