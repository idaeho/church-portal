"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Eye, EyeOff, Trash2, UserPlus } from "lucide-react";
import type { Feedback } from "@/lib/db";

const MAX_USERS = 5;

type User = { id: number; email: string; name: string; role: string; created_at: string };

export default function AdminPage() {
  const { data: session } = useSession();

  // 피드백
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [tab, setTab]             = useState<"pending" | "reviewed" | "done">("pending");

  // 비밀번호 변경
  const [pw, setPw]       = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // 계정 관리
  const [users, setUsers]       = useState<User[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName]   = useState("");
  const [newPass, setNewPass]   = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [userMsg, setUserMsg]   = useState("");
  const [userErr, setUserErr]   = useState("");

  useEffect(() => {
    fetch(`/api/feedback?status=${tab}`).then((r) => r.json()).then(setFeedbacks);
  }, [tab]);

  useEffect(() => {
    fetch("/api/admin/users").then((r) => r.json()).then(setUsers);
  }, []);

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

  async function addUser() {
    setUserErr(""); setUserMsg("");
    if (!newEmail.trim() || !newPass.trim()) {
      setUserErr("이메일과 비밀번호를 입력하세요."); return;
    }
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, password: newPass, name: newName }),
    });
    const data = await res.json();
    if (!res.ok) { setUserErr(data.error); return; }
    setUsers((prev) => [...prev, data]);
    setUserMsg(`${data.email} 계정이 추가됐습니다.`);
    setNewEmail(""); setNewName(""); setNewPass("");
    setTimeout(() => setUserMsg(""), 3000);
  }

  async function deleteUser(id: number) {
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { setUserErr(data.error); return; }
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <PageWrapper title="관리자 설정" subtitle="피드백 관리 · 계정 관리 · 비밀번호 변경">

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
                      <span className="text-xs text-slate-400">{new Date(f.created_at).toLocaleDateString("ko-KR")}</span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{f.content}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {tab === "pending" && (
                      <button onClick={() => markStatus(f.id, "reviewed")}
                        className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded hover:bg-amber-200">검토 중</button>
                    )}
                    <button onClick={() => markStatus(f.id, "done")}
                      className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded hover:bg-emerald-200">완료</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 계정 관리 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-bold text-slate-800 mb-1">👥 관리자 계정 관리</h2>
        <p className="text-xs text-slate-400 mb-4">최대 {MAX_USERS}개 · 현재 {users.length}개</p>

        {/* 기존 계정 목록 */}
        <div className="space-y-2 mb-5">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between border border-slate-100 rounded-lg px-4 py-2.5 bg-slate-50">
              <div>
                <span className="text-sm font-medium text-slate-800">{u.name}</span>
                <span className="text-xs text-slate-400 ml-2">{u.email}</span>
              </div>
              <div className="flex items-center gap-2">
                {u.email === session?.user?.email && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">현재 계정</span>
                )}
                <button
                  onClick={() => deleteUser(u.id)}
                  disabled={u.email === session?.user?.email}
                  className="text-slate-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="계정 삭제"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 새 계정 추가 */}
        {users.length < MAX_USERS ? (
          <div className="border border-dashed border-slate-300 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-1.5">
              <UserPlus size={15} /> 새 계정 추가
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder="이메일 *"
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="이름 (선택)"
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  value={newPass} onChange={(e) => setNewPass(e.target.value)}
                  placeholder="비밀번호 8자 이상 *"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button type="button" onClick={() => setShowNewPass((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                  {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button onClick={addUser}
              className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-600">
              추가
            </button>
            {userErr && <p className="text-sm text-red-500 mt-2">{userErr}</p>}
            {userMsg && <p className="text-sm text-emerald-600 mt-2">{userMsg}</p>}
          </div>
        ) : (
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            관리자 계정이 최대({MAX_USERS}개)에 도달했습니다. 기존 계정을 삭제 후 추가 가능합니다.
          </div>
        )}
      </div>

      {/* 비밀번호 변경 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-slate-800 mb-4">🔐 내 비밀번호 변경</h2>
        <div className="space-y-3 max-w-sm">
          <div className="relative">
            <input type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)}
              placeholder="현재 비밀번호"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div className="relative">
            <input type={showNewPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)}
              placeholder="새 비밀번호 (8자 이상)"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <button type="button" onClick={() => setShowNewPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
              {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
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
