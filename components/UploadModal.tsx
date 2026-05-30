"use client";
import { useState, useRef } from "react";

interface Props {
  type: "offering" | "expense";
  weekId: string;
  onSuccess: (inserted: number) => void;
  onClose: () => void;
}

export function UploadModal({ type, weekId, onSuccess, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const label = type === "offering" ? "헌금" : "지출";

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    fd.append("week_id", weekId);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "업로드 실패");
      }
      const data = await res.json();
      setStatus("done");
      onSuccess(data.inserted);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "업로드 실패");
    }
  }

  function downloadTemplate() {
    window.open(`/api/templates?type=${type}`, "_blank");
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800">📂 {label} 엑셀 일괄 업로드</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        {/* 템플릿 다운로드 */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-700">📥 엑셀 템플릿 다운로드</div>
            <div className="text-xs text-slate-500 mt-0.5">
              템플릿 양식으로 작성 후 업로드하면 자동으로 분류됩니다
            </div>
          </div>
          <button
            onClick={downloadTemplate}
            className="text-primary border border-primary text-sm px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors font-medium"
          >
            다운로드
          </button>
        </div>

        {/* 파일 선택 */}
        <div
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${file ? "border-emerald-400 bg-emerald-50" : "border-slate-300 hover:border-primary hover:bg-primary/5"}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <div>
              <div className="text-2xl mb-1">📊</div>
              <div className="text-sm font-medium text-emerald-700">{file.name}</div>
              <div className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</div>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2 text-slate-300">📁</div>
              <div className="text-sm text-slate-500">
                .xlsx 파일을 선택하거나 드래그하세요
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mt-3 text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{errorMsg}</div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm hover:bg-slate-50">
            취소
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || status === "uploading"}
            className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-40 transition-colors"
          >
            {status === "uploading" ? "업로드 중..." : status === "done" ? "✓ 완료" : "업로드"}
          </button>
        </div>
      </div>
    </div>
  );
}
