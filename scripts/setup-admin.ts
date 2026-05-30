/**
 * 관리자 계정 초기 생성 스크립트
 *
 * 실행: ADMIN_EMAIL=xxx ADMIN_PASSWORD=xxx npx tsx scripts/setup-admin.ts
 * 또는 .env 파일에 ADMIN_EMAIL, ADMIN_PASSWORD 설정 후 실행
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const email    = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name     = process.env.ADMIN_NAME || "관리자";

  if (!email || !password) {
    console.error("ADMIN_EMAIL, ADMIN_PASSWORD 환경변수 필수");
    process.exit(1);
  }

  // 스키마 적용
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      email      VARCHAR(255) UNIQUE NOT NULL,
      password   VARCHAR(255) NOT NULL,
      name       VARCHAR(100) NOT NULL DEFAULT '관리자',
      role       VARCHAR(50)  NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const hash = await bcrypt.hash(password, 12);
  await sql`
    INSERT INTO users (email, password, name, role)
    VALUES (${email}, ${hash}, ${name}, 'admin')
    ON CONFLICT (email) DO UPDATE SET password = ${hash}, updated_at = NOW()
  `;

  console.log(`✓ 관리자 계정 생성/업데이트: ${email}`);
}

main().catch(console.error);
