const fs = require("fs");
const path = require("path");

module.exports = {
  async up(queryInterface, Sequelize) {
    const iconDataPath = path.join(__dirname, "../constants/category-icon-data.json");
    const raw = fs.readFileSync(iconDataPath, "utf8");
    const iconData = JSON.parse(raw);

    const groups = iconData.categoryGroups.map((g) => ({
      user_id: null,
      name: g.name,
      type: g.type,
      icon_key: g.icon_key,
    }));

    // Check for existing system groups to avoid duplicates
    const [existingGroups] = await queryInterface.sequelize.query(
      `SELECT name, type FROM category_groups WHERE user_id IS NULL`,
    );

    const existingSet = new Set(existingGroups.map((entry) => `${entry.name}-${entry.type}`));

    // Filter out groups that already exist
    const newGroups = groups.filter((g) => !existingSet.has(`${g.name}-${g.type}`));

    if (newGroups.length > 0) {
      await queryInterface.bulkInsert("category_groups", newGroups);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("category_groups", {
      user_id: null,
    });
  },
};
