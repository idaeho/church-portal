"use client";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { FeedbackForm } from "@/components/FeedbackForm";
import type { Offering } from "@/lib/db";

const KINDS = ["전체", "십일조", "감사헌금", "주일헌금", "건축헌금", "선교헌금", "구역헌금", "특별헌금"];

export default function IncomePage() {
  const [rows, setRows]       = useState<Offering[]>([]);
  const [filter, setFilter]   = useState("전체");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/offerings?limit=10000").then((r) => r.json()).then((d) => { setRows(d); setLoading(false); });
  }, []);

  const filtered = filter === "전체" ? rows : rows.filter((r) => r.kind === filter);
  const total    = filtered.reduce((s, r) => s + r.amount, 0);

  function fmt(n: number) { return n.toLocaleString("ko-KR") + "원"; }

  return (
    <PageWrapper title="수입내역" subtitle="헌금 전체 내역 조회">
      {/* 필터 */}
      <div className="flex gap-2 flex-wrap mb-4">
        {KINDS.map((k) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              filter === k ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400"
            }`}>
            {k}
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
                <th className="text-left px-4 py-3 text-slate-500 font-medium">종류</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">이름</th>
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
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">{r.kind}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{r.member_name || "-"}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-emerald-600">{fmt(r.amount)}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{r.note || ""}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-emerald-50">
              <tr>
                <td colSpan={3} className="px-4 py-3 font-bold text-slate-700">합계 ({filtered.length}건)</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-700">{fmt(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <FeedbackForm page="income" />
    </PageWrapper>
  );
}
