const fs = require("fs");
const path = require("path");

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const iconDataPath = path.join(__dirname, "../constants/category-icon-data.json");
    const raw = fs.readFileSync(iconDataPath, "utf8");
    const iconData = JSON.parse(raw);

    const [groups] = await queryInterface.sequelize.query(
      `SELECT group_id, type, name FROM category_groups WHERE user_id IS NULL`,
    );

    /**
     * Returns the group_id of a category group with the given type and name.
     * Returns null if no such group is found.
     */
    const gid = (type, name) => {
      const group = groups.find((x) => x.type === type && x.name === name);
      return group ? group.group_id : null;
    };

    const categories = iconData.categories.map((c) => ({
      user_id: null,
      name: c.name,
      type: c.type,
      group_id: gid(c.type, c.group),
      icon_key: c.icon_key,
      is_system: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    }));

    // Check for existing system categories to avoid duplicates
    const [existingCategories] = await queryInterface.sequelize.query(
      `SELECT name, type FROM categories WHERE user_id IS NULL AND is_system = true`,
    );

    const existingSet = new Set(existingCategories.map((entry) => `${entry.name}-${entry.type}`));

    // Filter out categories that already exist
    const newCategories = categories.filter((c) => !existingSet.has(`${c.name}-${c.type}`));

    if (newCategories.length > 0) {
      await queryInterface.bulkInsert("categories", newCategories);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("categories", {
      user_id: null,
      is_system: true,
    });
  },
};
