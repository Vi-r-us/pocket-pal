import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules", "src/seeders/**/*.cjs", "src/config/env.config.cjs", "src/migrations/**/*.cjs"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];
