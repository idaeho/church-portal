/**
 * NeonDB 스키마 마이그레이션
 * 실행: npx tsx scripts/migrate.ts
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const schema = readFileSync(join(process.cwd(), "db/schema.sql"), "utf-8");

  // 세미콜론으로 분리해서 순차 실행
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("--"));

  for (const stmt of statements) {
    if (!stmt) continue;
    await sql.unsafe(stmt);
    console.log("✓", stmt.slice(0, 60).replace(/\n/g, " ") + (stmt.length > 60 ? "..." : ""));
  }

  console.log("\n마이그레이션 완료");
}

main().catch(console.error);
