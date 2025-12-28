module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const groups = [
      // Income
      { name: "Salary & Work", type: "income" },
      { name: "Other Income", type: "income" },

      // Expense
      { name: "Essentials", type: "expense" },
      { name: "Lifestyle", type: "expense" },
      { name: "Family & Home", type: "expense" },
      { name: "Giving", type: "expense" },
      { name: "Misc", type: "expense" },

      // Savings
      { name: "Core Savings", type: "savings" },
      { name: "Investments", type: "savings" },
      { name: "Goals", type: "savings" },
    ].map((g) => ({
      user_id: null,
      name: g.name,
      type: g.type
    }));

    // Check for existing system groups to avoid duplicates
    const [existingGroups] = await queryInterface.sequelize.query(
      `SELECT name, type FROM category_groups WHERE user_id IS NULL`
    );

    const existingSet = new Set(existingGroups.map((g) => `${g.name}-${g.type}`));

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