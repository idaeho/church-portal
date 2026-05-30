"use client";
import { useState, useEffect, useCallback } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { FeedbackForm } from "@/components/FeedbackForm";
import { UploadModal } from "@/components/UploadModal";
import { detectOfferingKind, OFFERING_RULES, parseKoreanAmount } from "@/lib/auto-classify";
import type { Offering } from "@/lib/db";

const CURRENT_WEEK = "5-3";
const TODAY = new Date().toISOString().slice(0, 10);

type Row = Partial<Offering> & { _autoKind?: boolean; _localId?: number };

let localIdCounter = 1;

function fmt(n: number | undefined | null) {
  if (!n) return "";
  return n.toLocaleString("ko-KR");
}

function AmountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [focused, setFocused] = useState(false);
  const [display, setDisplay] = useState(value > 0 ? fmt(value) : "");

  useEffect(() => {
    if (!focused) setDisplay(value > 0 ? fmt(value) : "");
  }, [value, focused]);

  return (
    <input
      type="text"
      value={focused ? (value > 0 ? String(value) : "") : display}
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, "");
        const n = parseInt(raw) || 0;
        onChange(n);
        setDisplay(raw);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setDisplay(value > 0 ? fmt(value) : "");
      }}
      placeholder="0"
      className="text-right"
    />
  );
}

export default function OfferingsPage() {
  const [rows, setRows]         = useState<Row[]>([]);
  const [quickText, setQuickText] = useState("");
  const [weekId, setWeekId]     = useState(CURRENT_WEEK);
  const [showUpload, setShowUpload] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  function makeBlankRows(n = 5): Row[] {
    return Array.from({ length: n }, () => ({
      _localId: localIdCounter++, entry_date: TODAY,
      kind: "", member_name: "", amount: 0, note: "", week_id: weekId,
    }));
  }

  const loadRows = useCallback(async () => {
    const res = await fetch(`/api/offerings?week_id=${weekId}`);
    const data: Offering[] = await res.json();
    const existing = data.map((r) => ({ ...r, _localId: localIdCounter++ }));
    setRows([...existing, ...makeBlankRows(5)]);
  }, [weekId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadRows(); }, [loadRows]);

  function addEmptyRows(n = 10) {
    setRows((prev) => [...prev, ...makeBlankRows(n)]);
  }

  function updateRow(idx: number, field: string, value: string | number) {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[idx], [field]: value } as Row;

      if (field === "member_name" || field === "note") {
        const combined = `${row.member_name || ""} ${row.note || ""}`;
        const detected = detectOfferingKind(combined);
        if (detected && !row._autoKind) {
          row.kind = detected;
          row._autoKind = true;
        }
      }
      if (field === "kind") row._autoKind = false;

      next[idx] = row;
      return next;
    });
  }

  async function saveAll() {
    setSaving(true);
    const toSave = rows.filter((r) => r.amount && r.amount > 0 && !r.id);
    for (const row of toSave) {
      await fetch("/api/offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...row, week_id: weekId }),
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadRows();
  }

  async function deleteRow(row: Row) {
    if (row.id) {
      await fetch(`/api/offerings?id=${row.id}`, { method: "DELETE" });
    }
    setRows((prev) => prev.filter((r) => r._localId !== row._localId));
  }

  function submitQuick() {
    const t = quickText.trim();
    if (!t) return;
    const kind = detectOfferingKind(t) || "";
    const amt = parseKoreanAmount(t);
    setRows((prev) => [
      ...prev,
      {
        _localId: localIdCounter++, entry_date: TODAY, week_id: weekId,
        kind, member_name: t.replace(/\d+만?원?/g, "").replace(kind, "").trim(),
        amount: amt, note: "", _autoKind: !!kind,
      },
    ]);
    setQuickText("");
  }

  const totalAmount = rows.filter((r) => r.id).reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <PageWrapper
      title="헌금 입력"
      subtitle={`${weekId}주차 · 이름 입력 시 종류 자동감지 · 엑셀 일괄 업로드 가능`}
    >
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="text-sm font-medium text-slate-600">주차</label>
        <input
          type="text" value={weekId}
          onChange={(e) => setWeekId(e.target.value)}
          className="border border-slate-300 rounded px-3 py-1.5 text-sm w-24"
        />
        {totalAmount > 0 && (
          <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
            합계: {totalAmount.toLocaleString("ko-KR")}원
          </span>
        )}
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
      <div className="quick-bar offering mb-4">
        <span className="text-sm font-bold text-emerald-700 shrink-0">⚡ 빠른입력</span>
        <input type="text" value={quickText}
          onChange={(e) => setQuickText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitQuick()}
          placeholder="예: 배미경 십일조 50만 · 김선영 감사헌금 10만"
          className="flex-1 bg-transparent border-none outline-none text-sm"
        />
        <button onClick={submitQuick}
          className="bg-emerald-500 text-white text-xs px-3 py-1 rounded-full font-medium">
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
                <th className="w-40">종류 ← 자동감지</th>
                <th className="w-36">이름 (자동완성)</th>
                <th className="w-36">금액 (원)</th>
                <th className="w-36">비고</th>
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
                  <td className={row._autoKind ? "auto-fill" : ""}>
                    <select value={row.kind || ""}
                      onChange={(e) => updateRow(i, "kind", e.target.value)}>
                      <option value="">— 종류 선택 —</option>
                      {OFFERING_RULES.map((r) => (
                        <option key={r.kind} value={r.kind}>{r.kind}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="text" value={row.member_name || ""}
                      onChange={(e) => updateRow(i, "member_name", e.target.value)}
                      placeholder="이름 입력" />
                  </td>
                  <td>
                    <AmountInput
                      value={row.amount || 0}
                      onChange={(v) => updateRow(i, "amount", v)}
                    />
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
        <UploadModal type="offering" weekId={weekId}
          onSuccess={(n) => { setShowUpload(false); loadRows(); alert(`${n}건 업로드 완료`); }}
          onClose={() => setShowUpload(false)} />
      )}

      <FeedbackForm page="offerings" />
    </PageWrapper>
  );
}
