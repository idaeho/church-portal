"use client";
import { useState } from "react";

interface Props {
  page: string;
}

export function FeedbackForm({ page }: Props) {
  const [content, setContent] = useState("");
  const [submitter, setSubmitter] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit() {
    if (!content.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, content, submitter }),
      });
      if (!res.ok) throw new Error();
      setContent("");
      setSubmitter("");
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="feedback-section">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        💬 이 화면에 대한 의견 / 개선 요청
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        불편하신 점, 필요한 기능, 버그 등을 자유롭게 남겨주세요. 개발팀이 검토 후 반영합니다.
      </p>
      <div className="flex gap-3 mb-2">
        <input
          type="text"
          value={submitter}
          onChange={(e) => setSubmitter(e.target.value)}
          placeholder="이름 (선택)"
          className="w-32 border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="예: 금액 입력 후 자동으로 다음 줄로 이동하면 좋겠어요"
          rows={3}
          className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={status === "loading" || !content.trim()}
          className="bg-primary text-white text-sm px-5 py-2 rounded-lg font-medium hover:bg-primary-600 disabled:opacity-40 transition-colors"
        >
          {status === "loading" ? "저장 중..." : "의견 보내기"}
        </button>
        {status === "done" && <span className="text-emerald-600 text-sm font-medium">✓ 전달됐습니다. 감사합니다!</span>}
        {status === "error" && <span className="text-red-500 text-sm">저장 실패. 다시 시도해주세요.</span>}
      </div>
    </div>
  );
}
