"use client";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { FeedbackForm } from "@/components/FeedbackForm";
import type { Expense } from "@/lib/db";

const CATS = ["전체", "사례비", "관리비", "대출이자", "보험료", "목회행정비", "선교비", "기타"];

export default function ExpenseViewPage() {
  const [rows, setRows]       = useState<Expense[]>([]);
  const [filter, setFilter]   = useState("전체");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/expenses?limit=10000").then((r) => r.json()).then((d) => { setRows(d); setLoading(false); });
  }, []);

  const filtered = filter === "전체" ? rows : rows.filter((r) => r.category === filter);
  const total    = filtered.reduce((s, r) => s + r.amount, 0);

  function fmt(n: number) { return n.toLocaleString("ko-KR") + "원"; }

  return (
    <PageWrapper title="지출내역" subtitle="지출 전체 내역 조회">
      <div className="flex gap-2 flex-wrap mb-4">
        {CATS.map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              filter === c ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-600 border-slate-200 hover:border-amber-400"
            }`}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">데이터 로딩 중...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">날짜</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">계정과목</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">내역</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">금액</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">비고</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">데이터 없음</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600">{r.entry_date}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">{r.category}</span>
                      {r.auto_detected && <span className="ml-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">AUTO</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{r.detail}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-amber-600">{fmt(r.amount)}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{r.note || ""}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-amber-50">
              <tr>
                <td colSpan={3} className="px-4 py-3 font-bold text-slate-700">합계 ({filtered.length}건)</td>
                <td className="px-4 py-3 text-right font-bold text-amber-700">{fmt(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <FeedbackForm page="expense-view" />
    </PageWrapper>
  );
}
