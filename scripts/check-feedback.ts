/**
 * 피드백 체크 + 이메일 발송 (로컬 실행 전용)
 *
 * 실행: npx tsx scripts/check-feedback.ts
 *
 * 이메일 발송: gog CLI (Google Workspace Admin CLI)
 *   설치: https://github.com/jay0lee/GAM
 *   환경변수: GOG_TO (수신 주소), 없으면 NOTIFY_EMAIL 사용
 *
 * crontab 설정 (매일 오전 9시):
 *   0 9 * * * cd /path/to/church-portal && npx tsx scripts/check-feedback.ts >> /tmp/church-feedback.log 2>&1
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { execFileSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { decrypt } from "../lib/crypto";

const DATABASE_URL = process.env.DATABASE_URL;
const TO_EMAIL     = process.env.GOG_TO || process.env.NOTIFY_EMAIL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL 환경변수 없음");
  process.exit(1);
}
if (!TO_EMAIL) {
  console.error("GOG_TO 또는 NOTIFY_EMAIL 환경변수 없음");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  console.log(`[${new Date().toISOString()}] 피드백 체크 시작`);

  const items = await sql`
    SELECT id, page, content, submitter_enc, created_at
    FROM feedback
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT 50
  `;

  console.log(`미처리 피드백: ${items.length}건`);
  if (items.length === 0) { console.log("보낼 피드백 없음. 종료."); return; }

  const subject = `[꿈꾸는교회 포털] 미처리 피드백 ${items.length}건 — ${new Date().toLocaleDateString("ko-KR")}`;

  const body = [
    "=== 꿈꾸는교회 재정관리 포털 피드백 요약 ===",
    "",
    `📊 미처리 피드백: ${items.length}건`,
    `📅 기준일: ${new Date().toLocaleString("ko-KR")}`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    ...items.map((f, i) => [
      `[${i + 1}] 📍 페이지: ${f.page}`,
      `    👤 작성자: ${f.submitter_enc ? decrypt(f.submitter_enc as string) : "익명"}`,
      `    📝 내용:\n       ${f.content}`,
      `    🕐 날짜: ${new Date(f.created_at).toLocaleString("ko-KR")}`,
      "",
    ].join("\n")),
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "처리: 포털 접속 → 관리자 설정 → 피드백 관리",
    "",
    "-- 자동 발송 (꿈꾸는교회 재정관리 포털)",
  ].join("\n");

  // 임시 파일에 본문 저장 (mode 0o600: 소유자 읽기/쓰기만)
  const tmpFile = join(tmpdir(), `church-feedback-${Date.now()}.txt`);
  writeFileSync(tmpFile, body, { encoding: "utf-8", mode: 0o600 });

  let delivered = false;
  try {
    // execFileSync 사용으로 shell injection 방지 (TO_EMAIL 직접 보간 안 함)
    execFileSync("gog", [
      "sendemail",
      `--to=${TO_EMAIL}`,
      `--subject=${subject}`,
      `--body-file=${tmpFile}`,
    ], { stdio: "inherit" });
    console.log(`이메일 발송 완료 → ${TO_EMAIL}`);
    delivered = true;
  } catch (e) {
    console.error("gog CLI 실패 또는 미설치. 발송 미완료 — 상태 업데이트 건너뜀.");
  } finally {
    unlinkSync(tmpFile);
  }

  if (!delivered) return;

  // 발송 성공 후에만 reviewed 처리
  const ids = items.map((f) => f.id as number);
  await sql`
    UPDATE feedback
    SET status = 'reviewed', reviewed_at = NOW()
    WHERE id = ANY(${ids})
  `;
  console.log(`${items.length}건 'reviewed' 처리 완료`);
}

main().catch((e) => { console.error("에러:", e); process.exit(1); });
