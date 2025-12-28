module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const [groups] = await queryInterface.sequelize.query(
      `SELECT group_id, type, name FROM category_groups WHERE user_id IS NULL`
    );

    /**
     * Returns the group_id of a category group with the given type and name.
     * Returns null if no such group is found.
     */
    const gid = (type, name) => {
      const g = groups.find((x) => x.type === type && x.name === name);
      return g ? g.group_id : null;
    };

    const categories = [
      // Income
      { name: "Salary / Wages", type: "income", group: "Salary & Work" },
      { name: "Bonus", type: "income", group: "Salary & Work" },
      { name: "Freelance / Side Hustle", type: "income", group: "Salary & Work" },
      { name: "Interest", type: "income", group: "Other Income" },
      { name: "Dividends", type: "income", group: "Other Income" },
      { name: "Gifts Received", type: "income", group: "Other Income" },
      { name: "Refunds / Reimbursements", type: "income", group: "Other Income" },
      { name: "Other Income", type: "income", group: "Other Income" },

      // Expense - Essentials
      { name: "Housing (Rent/Mortgage)", type: "expense", group: "Essentials" },
      { name: "Utilities", type: "expense", group: "Essentials" },
      { name: "Groceries", type: "expense", group: "Essentials" },
      { name: "Transportation", type: "expense", group: "Essentials" },
      { name: "Fuel", type: "expense", group: "Essentials" },
      { name: "Insurance", type: "expense", group: "Essentials" },
      { name: "Healthcare", type: "expense", group: "Essentials" },
      { name: "Education", type: "expense", group: "Essentials" },
      { name: "Debt Payments (EMI/Credit Card)", type: "expense", group: "Essentials" },
      { name: "Taxes", type: "expense", group: "Essentials" },

      // Expense - Lifestyle
      { name: "Dining Out", type: "expense", group: "Lifestyle" },
      { name: "Shopping", type: "expense", group: "Lifestyle" },
      { name: "Entertainment", type: "expense", group: "Lifestyle" },
      { name: "Subscriptions", type: "expense", group: "Lifestyle" },
      { name: "Travel", type: "expense", group: "Lifestyle" },
      { name: "Personal Care", type: "expense", group: "Lifestyle" },
      { name: "Fitness", type: "expense", group: "Lifestyle" },

      // Expense - Family & Home
      { name: "Household Supplies", type: "expense", group: "Family & Home" },
      { name: "Home Maintenance", type: "expense", group: "Family & Home" },
      { name: "Childcare", type: "expense", group: "Family & Home" },
      { name: "Pets", type: "expense", group: "Family & Home" },

      // Expense - Giving / Misc
      { name: "Donations / Charity", type: "expense", group: "Giving" },
      { name: "Gifts Given", type: "expense", group: "Giving" },
      { name: "Fees & Charges", type: "expense", group: "Misc" },
      { name: "Other Expense", type: "expense", group: "Misc" },

      // Savings
      { name: "Emergency Fund", type: "savings", group: "Core Savings" },
      { name: "Retirement", type: "savings", group: "Core Savings" },
      { name: "Fixed Deposit / Bonds", type: "savings", group: "Investments" },
      { name: "Mutual Funds / SIP", type: "savings", group: "Investments" },
      { name: "Stocks / Portfolio", type: "savings", group: "Investments" },
      { name: "Down Payment", type: "savings", group: "Goals" },
      { name: "Travel Fund", type: "savings", group: "Goals" },
      { name: "Education Fund", type: "savings", group: "Goals" },
      { name: "Other Savings", type: "savings", group: "Goals" },
    ].map((c) => ({
      user_id: null,
      name: c.name,
      type: c.type,
      group_id: gid(c.type, c.group),
      is_system: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    }));

    // Check for existing system categories to avoid duplicates
    const [existingCategories] = await queryInterface.sequelize.query(
      `SELECT name, type FROM categories WHERE user_id IS NULL AND is_system = true`
    );

    const existingSet = new Set(existingCategories.map((c) => `${c.name}-${c.type}`));

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
