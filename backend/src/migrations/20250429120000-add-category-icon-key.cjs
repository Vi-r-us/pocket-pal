"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    const iconDataPath = path.join(__dirname, "../constants/category-icon-data.json");
    const raw = fs.readFileSync(iconDataPath, "utf8");
    const iconData = JSON.parse(raw);

    await sequelize.query(`
      ALTER TABLE category_groups
      ADD COLUMN IF NOT EXISTS icon_key VARCHAR(64);
    `);
    await sequelize.query(`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS icon_key VARCHAR(64);
    `);

    for (const row of iconData.categoryGroups) {
      await sequelize.query(
        `
        UPDATE category_groups
        SET icon_key = :icon_key
        WHERE user_id IS NULL AND name = :name AND type = :type;
      `,
        {
          replacements: { icon_key: row.icon_key, name: row.name, type: row.type },
        }
      );
    }

    for (const row of iconData.categories) {
      await sequelize.query(
        `
        UPDATE categories
        SET icon_key = :icon_key
        WHERE user_id IS NULL AND is_system = true AND name = :name AND type = :type;
      `,
        {
          replacements: { icon_key: row.icon_key, name: row.name, type: row.type },
        }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    await sequelize.query(`
      ALTER TABLE categories DROP COLUMN IF EXISTS icon_key;
    `);
    await sequelize.query(`
      ALTER TABLE category_groups DROP COLUMN IF EXISTS icon_key;
    `);
  },
};
