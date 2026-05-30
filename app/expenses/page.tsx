"use client";
import { useState, useEffect, useCallback } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { FeedbackForm } from "@/components/FeedbackForm";
import { UploadModal } from "@/components/UploadModal";
import { detectExpenseCat, EXPENSE_RULES, parseKoreanAmount } from "@/lib/auto-classify";
import type { Expense } from "@/lib/db";

const CURRENT_WEEK = "5-3";
const TODAY = new Date().toISOString().slice(0, 10);

type Row = Partial<Expense> & { _autoCat?: boolean; _localId?: number };

let localIdCounter = 1;

export default function ExpensesPage() {
  const [rows, setRows]           = useState<Row[]>([]);
  const [quickText, setQuickText] = useState("");
  const [weekId, setWeekId]       = useState(CURRENT_WEEK);
  const [showUpload, setShowUpload] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  const loadRows = useCallback(async () => {
    const res = await fetch(`/api/expenses?week_id=${weekId}`);
    const data: Expense[] = await res.json();
    setRows(data.map((r) => ({ ...r, _autoCat: r.auto_detected, _localId: localIdCounter++ })));
  }, [weekId]);

  useEffect(() => { loadRows(); }, [loadRows]);

  function addEmptyRows(n = 10) {
    setRows((prev) => [
      ...prev,
      ...Array.from({ length: n }, () => ({
        _localId: localIdCounter++, entry_date: TODAY,
        category: "", detail: "", amount: 0, note: "", week_id: weekId,
      })),
    ]);
  }

  function updateRow(idx: number, field: string, value: string | number) {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[idx], [field]: value } as Row;

      if (field === "detail") {
        const detected = detectExpenseCat(String(value));
        if (detected && !row._autoCat) {
          row.category = detected;
          row._autoCat = true;
        }
      }
      if (field === "category") row._autoCat = false;

      next[idx] = row;
      return next;
    });
  }

  async function saveAll() {
    setSaving(true);
    const toSave = rows.filter((r) => r.amount && r.amount > 0 && !r.id);
    for (const row of toSave) {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...row, week_id: weekId, auto_detected: row._autoCat }),
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadRows();
  }

  async function deleteRow(row: Row) {
    if (row.id) await fetch(`/api/expenses?id=${row.id}`, { method: "DELETE" });
    setRows((prev) => prev.filter((r) => r._localId !== row._localId));
  }

  function submitQuick() {
    const t = quickText.trim();
    if (!t) return;
    const cat = detectExpenseCat(t) || "";
    const amt = parseKoreanAmount(t);
    const detail = t.replace(/\d+만?원?/g, "").trim();
    setRows((prev) => [
      ...prev,
      {
        _localId: localIdCounter++, entry_date: TODAY, week_id: weekId,
        category: cat, detail: detail || t, amount: amt, note: "", _autoCat: !!cat,
      },
    ]);
    setQuickText("");
  }

  return (
    <PageWrapper
      title="지출 입력"
      subtitle={`${weekId}주차 · 상세내역 입력 시 계정과목 자동감지 · 엑셀 일괄 업로드 가능`}
    >
      {/* 툴바 */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-slate-600">주차</label>
        <input type="text" value={weekId}
          onChange={(e) => setWeekId(e.target.value)}
          className="border border-slate-300 rounded px-3 py-1.5 text-sm w-24" />
        <button onClick={() => setShowUpload(true)}
          className="ml-auto flex items-center gap-1.5 border border-slate-300 text-sm px-4 py-1.5 rounded-lg hover:bg-slate-50">
          📂 엑셀 업로드
        </button>
        <button onClick={saveAll} disabled={saving}
          className="bg-primary text-white text-sm px-5 py-1.5 rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50">
          {saving ? "저장 중..." : saved ? "✓ 저장됨" : "저장"}
        </button>
      </div>

      {/* 빠른입력 */}
      <div className="quick-bar expense mb-4">
        <span className="text-sm font-bold text-amber-700 shrink-0">⚡ 빠른입력</span>
        <input type="text" value={quickText}
          onChange={(e) => setQuickText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitQuick()}
          placeholder="예: 목사님 사례비 340만 · 코웨이렌탈 26500"
          className="flex-1 bg-transparent border-none outline-none text-sm" />
        <button onClick={submitQuick}
          className="bg-amber-500 text-white text-xs px-3 py-1 rounded-full font-medium">
          + 추가
        </button>
      </div>

      {/* 그리드 */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="excel-table">
            <thead>
              <tr>
                <th className="w-10">No.</th>
                <th className="w-32">날짜</th>
                <th className="w-40">계정과목 ← 자동감지</th>
                <th>상세내역 (입력 → 계정과목 자동)</th>
                <th className="w-32">금액 (원)</th>
                <th className="w-32">비고</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row._localId}>
                  <td className="row-num">{i + 1}</td>
                  <td>
                    <input type="date" value={row.entry_date || TODAY}
                      onChange={(e) => updateRow(i, "entry_date", e.target.value)} />
                  </td>
                  <td className={row._autoCat ? "auto-fill" : ""}>
                    <select value={row.category || ""}
                      onChange={(e) => updateRow(i, "category", e.target.value)}>
                      <option value="">— 계정과목 선택 —</option>
                      {EXPENSE_RULES.map((r) => (
                        <option key={r.cat} value={r.cat}>{r.cat}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="text" value={row.detail || ""}
                      onChange={(e) => updateRow(i, "detail", e.target.value)}
                      placeholder="상세내역 입력 → 계정과목 자동 감지" />
                  </td>
                  <td>
                    <input type="number" value={row.amount || ""}
                      onChange={(e) => updateRow(i, "amount", parseInt(e.target.value) || 0)}
                      placeholder="0" className="text-right" />
                  </td>
                  <td>
                    <input type="text" value={row.note || ""}
                      onChange={(e) => updateRow(i, "note", e.target.value)}
                      placeholder="비고" />
                  </td>
                  <td>
                    <button onClick={() => deleteRow(row)}
                      className="w-full h-full text-slate-300 hover:text-red-500 text-xs">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={() => addEmptyRows(10)}
        className="mt-3 text-sm text-primary hover:underline">
        + 10줄 추가
      </button>

      {showUpload && (
        <UploadModal type="expense" weekId={weekId}
          onSuccess={(n) => { setShowUpload(false); loadRows(); alert(`${n}건 업로드 완료`); }}
          onClose={() => setShowUpload(false)} />
      )}

      <FeedbackForm page="expenses" />
    </PageWrapper>
  );
}
