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
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const DATABASE_URL = process.env.DATABASE_URL;
const TO_EMAIL     = process.env.GOG_TO || process.env.NOTIFY_EMAIL || "idaeho@gmail.com";

if (!DATABASE_URL) {
  console.error("DATABASE_URL 환경변수 없음");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  console.log(`[${new Date().toISOString()}] 피드백 체크 시작`);

  const items = await sql`
    SELECT id, page, content, submitter, created_at
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
      `    👤 작성자: ${f.submitter || "익명"}`,
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

  // 임시 파일에 본문 저장
  const tmpFile = join(tmpdir(), `church-feedback-${Date.now()}.txt`);
  writeFileSync(tmpFile, body, "utf-8");

  try {
    // gog CLI로 이메일 발송
    // gog CLI가 없으면 아래 줄을 원하는 CLI 명령으로 교체하세요.
    // 예: gam sendemail ... / mutt -s subject ... / mail -s subject ...
    const cmd = `gog sendemail --to="${TO_EMAIL}" --subject="${subject}" --body-file="${tmpFile}"`;
    console.log(`실행: ${cmd}`);
    execSync(cmd, { stdio: "inherit" });
    console.log(`이메일 발송 완료 → ${TO_EMAIL}`);
  } catch (e) {
    // gog CLI 없으면 본문만 출력
    console.warn("gog CLI 실패 또는 미설치. 피드백 내용 출력:");
    console.log("\n" + body);
  } finally {
    unlinkSync(tmpFile);
  }

  // 발송 완료 항목 reviewed 처리
  const ids = items.map((f) => f.id as number);
  await sql`
    UPDATE feedback
    SET status = 'reviewed', reviewed_at = NOW()
    WHERE id = ANY(${ids})
  `;
  console.log(`${items.length}건 'reviewed' 처리 완료`);
}

main().catch((e) => { console.error("에러:", e); process.exit(1); });
