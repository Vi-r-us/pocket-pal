module.exports = {
  async up(queryInterface, Sequelize) {
    const currencies = [
      { code: "INR", minor_unit: 2, name: "Indian Rupee", symbol: "₹" },
      { code: "USD", minor_unit: 2, name: "US Dollar", symbol: "$" },
      { code: "EUR", minor_unit: 2, name: "Euro", symbol: "€" },
      { code: "GBP", minor_unit: 2, name: "Pound Sterling", symbol: "£" },
      { code: "JPY", minor_unit: 0, name: "Japanese Yen", symbol: "¥" },
      { code: "AUD", minor_unit: 2, name: "Australian Dollar", symbol: "A$" },
      { code: "CAD", minor_unit: 2, name: "Canadian Dollar", symbol: "C$" },
      { code: "SGD", minor_unit: 2, name: "Singapore Dollar", symbol: "S$" },
      { code: "HKD", minor_unit: 2, name: "Hong Kong Dollar", symbol: "HK$" },
      { code: "CNY", minor_unit: 2, name: "Chinese Yuan", symbol: "¥" },
      { code: "CHF", minor_unit: 2, name: "Swiss Franc", symbol: "CHF" },
      { code: "SEK", minor_unit: 2, name: "Swedish Krona", symbol: "kr" },
      { code: "NOK", minor_unit: 2, name: "Norwegian Krone", symbol: "kr" },
      { code: "DKK", minor_unit: 2, name: "Danish Krone", symbol: "kr" },
      { code: "NZD", minor_unit: 2, name: "New Zealand Dollar", symbol: "NZ$" },
      { code: "ZAR", minor_unit: 2, name: "South African Rand", symbol: "R" },
      { code: "AED", minor_unit: 2, name: "UAE Dirham", symbol: "د.إ" },
      { code: "SAR", minor_unit: 2, name: "Saudi Riyal", symbol: "﷼" },
      { code: "KRW", minor_unit: 0, name: "South Korean Won", symbol: "₩" },
      { code: "THB", minor_unit: 2, name: "Thai Baht", symbol: "฿" },
      { code: "IDR", minor_unit: 0, name: "Indonesian Rupiah", symbol: "Rp" },
      { code: "MYR", minor_unit: 2, name: "Malaysian Ringgit", symbol: "RM" },
      { code: "PHP", minor_unit: 2, name: "Philippine Peso", symbol: "₱" },
      { code: "BRL", minor_unit: 2, name: "Brazilian Real", symbol: "R$" },
      { code: "MXN", minor_unit: 2, name: "Mexican Peso", symbol: "$" },
      { code: "TRY", minor_unit: 2, name: "Turkish Lira", symbol: "₺" },
      { code: "ILS", minor_unit: 2, name: "Israeli New Shekel", symbol: "₪" },
      { code: "PLN", minor_unit: 2, name: "Polish Złoty", symbol: "zł" },
      { code: "CZK", minor_unit: 2, name: "Czech Koruna", symbol: "Kč" },
      { code: "HUF", minor_unit: 2, name: "Hungarian Forint", symbol: "Ft" },
      { code: "KWD", minor_unit: 3, name: "Kuwaiti Dinar", symbol: "د.ك" },
      { code: "BHD", minor_unit: 3, name: "Bahraini Dinar", symbol: "د.ب" },
      { code: "OMR", minor_unit: 3, name: "Omani Rial", symbol: "﷼" },
    ];

    const [existing] = await queryInterface.sequelize.query(
      `SELECT code FROM currencies`
    );
    const existingSet = new Set(existing.map((r) => r.code));
    const newRows = currencies.filter((c) => !existingSet.has(c.code));

    if (newRows.length > 0) {
      await queryInterface.bulkInsert("currencies", newRows);
    }
  },

  async down(queryInterface, Sequelize) {
    const SEEDED_CODES = [
      "INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "HKD", "CNY",
      "CHF", "SEK", "NOK", "DKK", "NZD", "ZAR", "AED", "SAR", "KRW", "THB",
      "IDR", "MYR", "PHP", "BRL", "MXN", "TRY", "ILS", "PLN", "CZK", "HUF",
      "KWD", "BHD", "OMR",
    ];
    const { Op } = Sequelize;
    await queryInterface.bulkDelete("currencies", {
      code: { [Op.in]: SEEDED_CODES },
    });
  },
};
