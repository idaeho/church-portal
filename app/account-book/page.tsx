"use client";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { FeedbackForm } from "@/components/FeedbackForm";
import type { Offering } from "@/lib/db";

export default function AccountBookPage() {
  const [rows, setRows]       = useState<Offering[]>([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/offerings?limit=10000").then((r) => r.json()).then((d) => { setRows(d); setLoading(false); });
  }, []);

  // 이름별 집계
  const byMember: Record<string, { total: number; count: number; items: Offering[] }> = {};
  rows.forEach((r) => {
    const name = r.member_name || "익명";
    if (!byMember[name]) byMember[name] = { total: 0, count: 0, items: [] };
    byMember[name].total += r.amount;
    byMember[name].count += 1;
    byMember[name].items.push(r);
  });

  const members = Object.entries(byMember)
    .filter(([name]) => search === "" || name.includes(search))
    .sort(([, a], [, b]) => b.total - a.total);

  const grandTotal = members.reduce((s, [, v]) => s + v.total, 0);

  function fmt(n: number) { return n.toLocaleString("ko-KR") + "원"; }

  return (
    <PageWrapper title="헌금대장" subtitle="교인별 헌금 내역 (🔒 관리자 전용)">
      <div className="mb-4 flex gap-3 items-center">
        <input
          type="text"
          placeholder="이름 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <span className="text-sm text-slate-500">{members.length}명 · 총 {fmt(grandTotal)}</span>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">데이터 로딩 중...</div>
      ) : members.length === 0 ? (
        <div className="text-slate-400 text-sm text-center py-12">데이터 없음</div>
      ) : (
        <div className="space-y-3">
          {members.map(([name, data]) => (
            <details key={name} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <summary className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-50 list-none">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                    {name[0]}
                  </div>
                  <span className="font-medium text-slate-800">{name}</span>
                  <span className="text-xs text-slate-400">{data.count}건</span>
                </div>
                <span className="font-bold text-blue-600">{fmt(data.total)}</span>
              </summary>
              <table className="w-full text-sm border-t border-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-5 py-2 text-slate-500 font-medium">날짜</th>
                    <th className="text-left px-5 py-2 text-slate-500 font-medium">종류</th>
                    <th className="text-right px-5 py-2 text-slate-500 font-medium">금액</th>
                    <th className="text-left px-5 py-2 text-slate-500 font-medium">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr key={r.id} className="border-t border-slate-50">
                      <td className="px-5 py-2 text-slate-600">{r.entry_date}</td>
                      <td className="px-5 py-2 text-slate-700">{r.kind}</td>
                      <td className="px-5 py-2 text-right font-medium text-emerald-600">{fmt(r.amount)}</td>
                      <td className="px-5 py-2 text-slate-400 text-xs">{r.note || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
        </div>
      )}
      <FeedbackForm page="account-book" />
    </PageWrapper>
  );
}
