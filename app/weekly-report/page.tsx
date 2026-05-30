"use client";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { FeedbackForm } from "@/components/FeedbackForm";
import type { Offering, Expense } from "@/lib/db";

const WEEKS = ["1-1","1-2","1-3","1-4","2-1","2-2","2-3","2-4","3-1","3-2","3-3","3-4",
               "4-1","4-2","4-3","4-4","5-1","5-2","5-3","5-4","6-1","6-2","6-3","6-4"];

export default function WeeklyReportPage() {
  const [weekId, setWeekId]   = useState("5-3");
  const [offerings, setOff]   = useState<Offering[]>([]);
  const [expenses, setExp]    = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/offerings?week_id=${weekId}`).then((r) => r.json()),
      fetch(`/api/expenses?week_id=${weekId}`).then((r) => r.json()),
    ]).then(([o, e]) => { setOff(o); setExp(e); setLoading(false); });
  }, [weekId]);

  const totalIncome  = offerings.reduce((s, r) => s + r.amount, 0);
  const totalExpense = expenses.reduce((s, r) => s + r.amount, 0);
  const balance      = totalIncome - totalExpense;

  const byKind: Record<string, number> = {};
  offerings.forEach((r) => { byKind[r.kind] = (byKind[r.kind] || 0) + r.amount; });

  const byCat: Record<string, number> = {};
  expenses.forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + r.amount; });

  function fmt(n: number) { return n.toLocaleString("ko-KR") + "원"; }
  const [mo, wk] = weekId.split("-");

  return (
    <PageWrapper title="주간결산 보고서" subtitle={`${mo}월 ${wk}주차`}>
      {/* 주차 선택 */}
      <div className="flex gap-2 flex-wrap mb-6">
        {WEEKS.map((w) => (
          <button key={w} onClick={() => setWeekId(w)}
            className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
              weekId === w ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
            }`}>
            {w.replace("-", "월")}주
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">데이터 로딩 중...</div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "수입 합계", value: fmt(totalIncome), cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
              { label: "지출 합계", value: fmt(totalExpense), cls: "bg-amber-50 border-amber-200 text-amber-700" },
              { label: "주간 잔액", value: fmt(balance), cls: balance >= 0 ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-red-50 border-red-200 text-red-700" },
            ].map((c) => (
              <div key={c.label} className={`rounded-xl border p-5 ${c.cls}`}>
                <div className="text-xs font-medium opacity-70 mb-1">{c.label}</div>
                <div className="text-2xl font-bold">{c.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* 수입 상세 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-800 mb-3">수입 상세 ({offerings.length}건)</h2>
              {Object.keys(byKind).length === 0 ? (
                <p className="text-slate-400 text-sm">데이터 없음</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(byKind).map(([k, v]) => (
                      <tr key={k} className="border-b border-slate-50">
                        <td className="py-1.5 text-slate-700">{k}</td>
                        <td className="py-1.5 text-right font-medium text-emerald-600">{fmt(v)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="pt-2 text-slate-800">합계</td>
                      <td className="pt-2 text-right text-emerald-700">{fmt(totalIncome)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* 지출 상세 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-800 mb-3">지출 상세 ({expenses.length}건)</h2>
              {Object.keys(byCat).length === 0 ? (
                <p className="text-slate-400 text-sm">데이터 없음</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(byCat).map(([c, v]) => (
                      <tr key={c} className="border-b border-slate-50">
                        <td className="py-1.5 text-slate-700">{c}</td>
                        <td className="py-1.5 text-right font-medium text-amber-600">{fmt(v)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="pt-2 text-slate-800">합계</td>
                      <td className="pt-2 text-right text-amber-700">{fmt(totalExpense)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
      <FeedbackForm page="weekly-report" />
    </PageWrapper>
  );
}
