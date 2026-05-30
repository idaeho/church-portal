"use client";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { FeedbackForm } from "@/components/FeedbackForm";
import type { Offering, Expense } from "@/lib/db";

const WEEK_ID = "5-3";

export default function DashboardPage() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/offerings?week_id=${WEEK_ID}`).then((r) => r.json()),
      fetch(`/api/expenses?week_id=${WEEK_ID}`).then((r) => r.json()),
    ]).then(([o, e]) => {
      setOfferings(o);
      setExpenses(e);
      setLoading(false);
    });
  }, []);

  const totalIncome  = offerings.reduce((s, r) => s + r.amount, 0);
  const totalExpense = expenses.reduce((s, r) => s + r.amount, 0);
  const balance      = totalIncome - totalExpense;

  const incomeByKind: Record<string, number> = {};
  offerings.forEach((r) => { incomeByKind[r.kind] = (incomeByKind[r.kind] || 0) + r.amount; });

  const expByCat: Record<string, number> = {};
  expenses.forEach((r) => { expByCat[r.category] = (expByCat[r.category] || 0) + r.amount; });

  function fmt(n: number) { return n.toLocaleString("ko-KR") + "원"; }

  return (
    <PageWrapper title="대시보드" subtitle={`${WEEK_ID}주차 현황`}>
      {loading ? (
        <div className="text-slate-400 text-sm">데이터 로딩 중...</div>
      ) : (
        <>
          {/* KPI 카드 */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <KpiCard label="이번 주 수입" value={fmt(totalIncome)} color="emerald" icon="↑" />
            <KpiCard label="이번 주 지출" value={fmt(totalExpense)} color="amber" icon="↓" />
            <KpiCard label="잔액" value={fmt(balance)} color={balance >= 0 ? "blue" : "red"} icon="=" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* 수입 내역 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-800 mb-3">수입 내역</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-1.5 text-slate-500 font-medium">종류</th>
                    <th className="text-right py-1.5 text-slate-500 font-medium">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(incomeByKind).map(([kind, amt]) => (
                    <tr key={kind} className="border-b border-slate-50">
                      <td className="py-1.5 text-slate-700">{kind}</td>
                      <td className="py-1.5 text-right font-medium text-emerald-600">{fmt(amt)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 font-bold text-slate-800">합계</td>
                    <td className="py-2 text-right font-bold text-emerald-700">{fmt(totalIncome)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 지출 내역 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-800 mb-3">지출 내역</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-1.5 text-slate-500 font-medium">계정과목</th>
                    <th className="text-right py-1.5 text-slate-500 font-medium">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(expByCat).map(([cat, amt]) => (
                    <tr key={cat} className="border-b border-slate-50">
                      <td className="py-1.5 text-slate-700">{cat}</td>
                      <td className="py-1.5 text-right font-medium text-amber-600">{fmt(amt)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 font-bold text-slate-800">합계</td>
                    <td className="py-2 text-right font-bold text-amber-700">{fmt(totalExpense)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <FeedbackForm page="dashboard" />
    </PageWrapper>
  );
}

function KpiCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber:   "bg-amber-50 border-amber-200 text-amber-700",
    blue:    "bg-blue-50 border-blue-200 text-blue-700",
    red:     "bg-red-50 border-red-200 text-red-700",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="text-xs font-medium opacity-70 mb-1">{icon} {label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
