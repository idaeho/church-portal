"use client";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { FeedbackForm } from "@/components/FeedbackForm";

const ACCOUNTS = [
  { name: "교회기업 통장", bank: "기업은행", number: "***-***-***", color: "blue" },
  { name: "황기섭기업 통장", bank: "기업은행", number: "***-***-***", color: "emerald" },
  { name: "황기섭농협 통장", bank: "농협은행", number: "***-***-***", color: "amber" },
];

export default function AccountMgmtPage() {
  return (
    <PageWrapper title="통장 관리" subtitle="3개 계좌 현황">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        ⚠️ 통장잔액과 마감잔액 불일치는 현금 출납 때문입니다. 정상 상태입니다.
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {ACCOUNTS.map((acc) => {
          const colors: Record<string, string> = {
            blue:    "bg-blue-50 border-blue-200 text-blue-700",
            emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
            amber:   "bg-amber-50 border-amber-200 text-amber-700",
          };
          return (
            <div key={acc.name} className={`rounded-xl border p-5 ${colors[acc.color]}`}>
              <div className="text-xs font-medium opacity-70 mb-1">{acc.bank}</div>
              <div className="font-bold text-lg mb-1">{acc.name}</div>
              <div className="text-sm opacity-70">{acc.number}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-slate-800 mb-2">개발 예정 기능</h2>
        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
          <li>통장 거래 내역 업로드 (Excel)</li>
          <li>통장잔액 vs 마감잔액 비교</li>
          <li>미정산 항목 자동 표시</li>
          <li>월별 잔액 추이 그래프</li>
        </ul>
        <p className="text-xs text-slate-400 mt-4">피드백으로 우선순위를 알려주세요.</p>
      </div>

      <FeedbackForm page="account-mgmt" />
    </PageWrapper>
  );
}
