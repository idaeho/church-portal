/**
 * 피드백 자동 체크 + 이메일 발송 스크립트
 *
 * 실행: npx tsx scripts/check-feedback.ts
 *
 * crontab 설정 (매일 오전 9시):
 *   0 9 * * * cd /path/to/church-portal && npx tsx scripts/check-feedback.ts >> /tmp/church-feedback.log 2>&1
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import nodemailer from "nodemailer";

const DATABASE_URL = process.env.DATABASE_URL;
const GMAIL_USER   = process.env.GMAIL_USER;
const GMAIL_PASS   = process.env.GMAIL_APP_PASSWORD;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || GMAIL_USER;

if (!DATABASE_URL || !GMAIL_USER || !GMAIL_PASS) {
  console.error("필수 환경변수 없음: DATABASE_URL, GMAIL_USER, GMAIL_APP_PASSWORD");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  console.log(`[${new Date().toISOString()}] 피드백 체크 시작`);

  // 미처리 피드백 조회
  const items = await sql`
    SELECT id, page, content, submitter, created_at
    FROM feedback
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT 50
  `;

  console.log(`미처리 피드백: ${items.length}건`);

  if (items.length === 0) {
    console.log("보낼 피드백 없음. 종료.");
    return;
  }

  // 이메일 본문 구성
  const body = items
    .map(
      (f, i) =>
        `[${i + 1}] 📍 페이지: ${f.page}\n` +
        `    👤 작성자: ${f.submitter || "익명"}\n` +
        `    📝 내용:\n       ${f.content}\n` +
        `    🕐 날짜: ${new Date(f.created_at).toLocaleString("ko-KR")}`
    )
    .join("\n\n─────────────────────────────────\n\n");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });

  await transporter.sendMail({
    from: `꿈꾸는교회 포털 <${GMAIL_USER}>`,
    to: NOTIFY_EMAIL,
    subject: `[꿈꾸는교회 포털] 미처리 피드백 ${items.length}건 — ${new Date().toLocaleDateString("ko-KR")}`,
    text: [
      "=== 꿈꾸는교회 재정관리 포털 피드백 요약 ===",
      "",
      `📊 미처리 피드백: ${items.length}건`,
      `📅 기준일: ${new Date().toLocaleString("ko-KR")}`,
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      body,
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      "처리 방법:",
      "1. 포털 접속 → 관리자 설정 → 피드백 관리",
      "2. 검토 후 '검토 중' → '완료' 버튼 클릭",
      "",
      "-- 자동 발송 (꿈꾸는교회 재정관리 포털)",
    ].join("\n"),
  });

  console.log(`이메일 발송 완료 → ${NOTIFY_EMAIL}`);

  // 발송된 항목들을 'reviewed' 상태로 업데이트
  const ids = items.map((f) => f.id);
  await sql`
    UPDATE feedback
    SET status = 'reviewed', reviewed_at = NOW()
    WHERE id = ANY(${ids})
  `;

  console.log(`${items.length}건 'reviewed' 처리 완료`);
}

main().catch((e) => {
  console.error("에러:", e);
  process.exit(1);
});
