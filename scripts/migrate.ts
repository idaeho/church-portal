/**
 * NeonDB 스키마 마이그레이션
 * 실행: npx tsx scripts/migrate.ts
 */

import "dotenv/config";
import { Pool } from "@neondatabase/serverless";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const statements = [
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    `CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      email      VARCHAR(255) UNIQUE NOT NULL,
      password   VARCHAR(255) NOT NULL,
      name       VARCHAR(100) NOT NULL DEFAULT '관리자',
      role       VARCHAR(50)  NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS offerings (
      id          SERIAL PRIMARY KEY,
      week_id     VARCHAR(10),
      entry_date  DATE NOT NULL,
      seq_no      INTEGER,
      kind        VARCHAR(100) NOT NULL,
      member_name VARCHAR(100),
      amount      INTEGER NOT NULL DEFAULT 0,
      note        VARCHAR(500),
      created_by  INTEGER REFERENCES users(id),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_offerings_week ON offerings(week_id)`,
    `CREATE INDEX IF NOT EXISTS idx_offerings_date ON offerings(entry_date)`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id            SERIAL PRIMARY KEY,
      week_id       VARCHAR(10),
      entry_date    DATE NOT NULL,
      category      VARCHAR(100) NOT NULL,
      detail        VARCHAR(500) NOT NULL,
      amount        INTEGER NOT NULL DEFAULT 0,
      note          VARCHAR(500),
      auto_detected BOOLEAN DEFAULT FALSE,
      created_by    INTEGER REFERENCES users(id),
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_week ON expenses(week_id)`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(entry_date)`,
    `CREATE TABLE IF NOT EXISTS members (
      id        SERIAL PRIMARY KEY,
      name      VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS feedback (
      id          SERIAL PRIMARY KEY,
      page        VARCHAR(100) NOT NULL,
      content     TEXT NOT NULL,
      submitter   VARCHAR(100),
      status      VARCHAR(50) DEFAULT 'pending',
      reviewed_at TIMESTAMPTZ,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status)`,
    `CREATE TABLE IF NOT EXISTS weekly_reports (
      id              SERIAL PRIMARY KEY,
      week_id         VARCHAR(10) NOT NULL UNIQUE,
      prev_balance    INTEGER DEFAULT 0,
      total_income    INTEGER DEFAULT 0,
      total_expense   INTEGER DEFAULT 0,
      closing_balance INTEGER DEFAULT 0,
      bank_balance    INTEGER DEFAULT 0,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];

  for (const stmt of statements) {
    await pool.query(stmt);
    console.log("✓", stmt.slice(0, 60).replace(/\n/g, " ").replace(/\s+/g, " ") + "...");
  }

  await pool.end();
  console.log("\n마이그레이션 완료");
}

main().catch(console.error);
