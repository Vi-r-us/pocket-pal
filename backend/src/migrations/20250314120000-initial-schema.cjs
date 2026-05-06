"use strict";

/**
 * Initial schema migration. Creates all tables in dependency order.
 * Uses IF NOT EXISTS so safe to run on DBs that already have tables (e.g. from sync in dev).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    const q = (sql) => sequelize.query(sql);

    await q(`
      CREATE TABLE IF NOT EXISTS currencies (
        code VARCHAR(3) PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        symbol VARCHAR(10) NOT NULL,
        minor_unit SMALLINT NOT NULL
      );
    `);
    await q(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        fullname VARCHAR(150) NOT NULL,
        avatar VARCHAR(255),
        "coverImage" VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        "refreshToken" VARCHAR(255),
        base_currency VARCHAR(3) REFERENCES currencies(code),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users(username);
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users(email);
      CREATE UNIQUE INDEX IF NOT EXISTS users_public_id_key ON users(public_id);
    `);
    await q(`
      DO $$ BEGIN CREATE TYPE category_type_enum AS ENUM ('income', 'expense', 'savings'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      CREATE TABLE IF NOT EXISTS category_groups (
        group_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id),
        type category_type_enum NOT NULL,
        name VARCHAR(80) NOT NULL
      );
    `);
    await q(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id),
        group_id INTEGER REFERENCES category_groups(group_id),
        name VARCHAR(80) NOT NULL,
        type category_type_enum NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_system BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_type_name ON categories(user_id, type, name);
      CREATE INDEX IF NOT EXISTS idx_categories_group_id ON categories(group_id);
    `);
    await q(`
      CREATE TABLE IF NOT EXISTS accounts (
        account_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id),
        name VARCHAR(80) NOT NULL,
        type VARCHAR(20) NOT NULL,
        currency_code VARCHAR(3) NOT NULL REFERENCES currencies(code),
        balance_minor BIGINT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_user_name ON accounts(user_id, name);
    `);
    await q(`
      CREATE TABLE IF NOT EXISTS fx_rates (
        fx_rate_id SERIAL PRIMARY KEY,
        base_currency VARCHAR(3) NOT NULL,
        target_currency VARCHAR(3) NOT NULL,
        as_of_date DATE NOT NULL,
        rate DECIMAL(10,6) NOT NULL,
        source VARCHAR(100) DEFAULT 'frankfurter',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS fx_rates_base_target_date ON fx_rates(base_currency, target_currency, as_of_date);
    `);
    await q(`
      CREATE TABLE IF NOT EXISTS logs (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(user_id),
        log_type VARCHAR(20) NOT NULL,
        action VARCHAR(50),
        entity VARCHAR(50),
        entity_id VARCHAR(50),
        field_name VARCHAR(50),
        old_value JSONB,
        new_value JSONB,
        message TEXT,
        stack TEXT,
        details JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS logs_user_id ON logs(user_id);
      CREATE INDEX IF NOT EXISTS logs_log_type ON logs(log_type);
    `);
    await q(`
      DO $$ BEGIN CREATE TYPE transaction_source_enum AS ENUM ('manual', 'recurring', 'transfer', 'external'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      CREATE TABLE IF NOT EXISTS transactions (
        transaction_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id),
        account_id INTEGER NOT NULL REFERENCES accounts(account_id),
        fx_rate_id INTEGER NOT NULL REFERENCES fx_rates(fx_rate_id),
        category_id INTEGER NOT NULL REFERENCES categories(category_id),
        amount_minor BIGINT NOT NULL,
        currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
        base_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
        amount_base_minor BIGINT NOT NULL,
        type VARCHAR(20) NOT NULL,
        source transaction_source_enum NOT NULL DEFAULT 'manual',
        description TEXT DEFAULT '',
        metadata JSONB,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS transactions_account_id ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS transactions_user_id ON transactions(user_id);
    `);
    await q(`
      CREATE TABLE IF NOT EXISTS user_hidden_categories (
        user_id INTEGER NOT NULL REFERENCES users(user_id),
        category_id INTEGER NOT NULL REFERENCES categories(category_id),
        PRIMARY KEY (user_id, category_id)
      );
    `);
    await q(`
      CREATE TABLE IF NOT EXISTS budget_periods (
        budget_period_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id),
        yyyy_mm INTEGER NOT NULL,
        currency_code VARCHAR(3) NOT NULL REFERENCES currencies(code),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_budget_periods_user_id ON budget_periods(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_periods_user_yyyy_mm ON budget_periods(user_id, yyyy_mm);
    `);
    await q(`
      CREATE TABLE IF NOT EXISTS budgets (
        budget_id SERIAL PRIMARY KEY,
        budget_period_id INTEGER NOT NULL REFERENCES budget_periods(budget_period_id),
        category_id INTEGER NOT NULL REFERENCES categories(category_id),
        amount_minor BIGINT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_budgets_budget_period_id ON budgets(budget_period_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_period_category ON budgets(budget_period_id, category_id);
    `);
    await q(`
      DO $$ BEGIN CREATE TYPE goal_status_enum AS ENUM ('active', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      CREATE TABLE IF NOT EXISTS goals (
        goal_id SERIAL PRIMARY KEY,
        public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(user_id),
        name VARCHAR(80) NOT NULL,
        target_amount_minor BIGINT NOT NULL,
        target_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
        category_id INTEGER REFERENCES categories(category_id),
        start_date DATE NOT NULL,
        end_date DATE,
        status goal_status_enum NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
      CREATE INDEX IF NOT EXISTS idx_goals_public_id ON goals(public_id);
      CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
    `);
  },

  async down(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    const q = (sql) => sequelize.query(sql);
    await q("DROP TABLE IF EXISTS goals CASCADE;");
    await q("DROP TABLE IF EXISTS budgets CASCADE;");
    await q("DROP TABLE IF EXISTS budget_periods CASCADE;");
    await q("DROP TABLE IF EXISTS user_hidden_categories CASCADE;");
    await q("DROP TABLE IF EXISTS transactions CASCADE;");
    await q("DROP TABLE IF EXISTS logs CASCADE;");
    await q("DROP TABLE IF EXISTS fx_rates CASCADE;");
    await q("DROP TABLE IF EXISTS accounts CASCADE;");
    await q("DROP TABLE IF EXISTS categories CASCADE;");
    await q("DROP TABLE IF EXISTS category_groups CASCADE;");
    await q("DROP TABLE IF EXISTS users CASCADE;");
    await q("DROP TABLE IF EXISTS currencies CASCADE;");
    await q("DROP TYPE IF EXISTS category_type_enum;");
    await q("DROP TYPE IF EXISTS transaction_source_enum;");
    await q("DROP TYPE IF EXISTS goal_status_enum;");
  },
};
