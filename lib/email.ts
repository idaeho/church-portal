import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendFeedbackSummary(feedbackItems: {
  id: number;
  page: string;
  content: string;
  submitter: string;
  created_at: string;
}[]) {
  if (feedbackItems.length === 0) return;

  const body = feedbackItems
    .map(
      (f, i) =>
        `[${i + 1}] 페이지: ${f.page}\n` +
        `    작성자: ${f.submitter || "익명"}\n` +
        `    내용: ${f.content}\n` +
        `    날짜: ${new Date(f.created_at).toLocaleString("ko-KR")}\n`
    )
    .join("\n---\n\n");

  await transporter.sendMail({
    from: `교회 포털 피드백 <${process.env.GMAIL_USER}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `[꿈꾸는교회 포털] 미처리 피드백 ${feedbackItems.length}건`,
    text: `미처리 피드백 목록\n\n${body}\n\n--\n교회 포털 자동발송`,
  });
}
