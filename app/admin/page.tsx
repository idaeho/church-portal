"use client";
import { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import type { Feedback } from "@/lib/db";

export default function AdminPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [tab, setTab]             = useState<"pending" | "reviewed" | "done">("pending");
  const [pw, setPw]               = useState("");
  const [newPw, setNewPw]         = useState("");
  const [pwMsg, setPwMsg]         = useState("");

  useEffect(() => {
    fetch(`/api/feedback?status=${tab}`)
      .then((r) => r.json())
      .then(setFeedbacks);
  }, [tab]);

  async function markStatus(id: number, status: string) {
    await fetch("/api/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
  }

  async function changePassword() {
    if (!newPw) return;
    const res = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: pw, newPassword: newPw }),
    });
    setPwMsg(res.ok ? "비밀번호가 변경됐습니다." : "변경 실패 (현재 비밀번호 확인)");
    setTimeout(() => setPwMsg(""), 3000);
    setPw(""); setNewPw("");
  }

  return (
    <PageWrapper title="관리자 설정" subtitle="피드백 관리 · 비밀번호 변경">
      {/* 피드백 관리 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-bold text-slate-800 mb-4">💬 피드백 관리</h2>

        <div className="flex gap-2 mb-4">
          {(["pending", "reviewed", "done"] as const).map((s) => (
            <button key={s} onClick={() => setTab(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${tab === s ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {s === "pending" ? "미처리" : s === "reviewed" ? "검토됨" : "완료"}
            </button>
          ))}
        </div>

        {feedbacks.length === 0 ? (
          <div className="text-slate-400 text-sm py-6 text-center">피드백 없음</div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((f) => (
              <div key={f.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{f.page}</span>
                      <span className="text-xs text-slate-400">{f.submitter}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(f.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{f.content}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {tab === "pending" && (
                      <button onClick={() => markStatus(f.id, "reviewed")}
                        className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded hover:bg-amber-200">
                        검토 중
                      </button>
                    )}
                    <button onClick={() => markStatus(f.id, "done")}
                      className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded hover:bg-emerald-200">
                      완료
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 비밀번호 변경 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-slate-800 mb-4">🔐 비밀번호 변경</h2>
        <div className="space-y-3 max-w-sm">
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            placeholder="현재 비밀번호"
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
            placeholder="새 비밀번호 (8자 이상)"
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <button onClick={changePassword}
            className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600">
            변경
          </button>
          {pwMsg && <p className="text-sm text-emerald-600">{pwMsg}</p>}
        </div>
      </div>
    </PageWrapper>
  );
}
