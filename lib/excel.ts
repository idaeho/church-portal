import * as XLSX from "xlsx";
import { detectExpenseCat, detectOfferingKind, parseKoreanAmount } from "./auto-classify";

export type OfferingRow = {
  entry_date: string;
  kind: string;
  member_name: string;
  amount: number;
  note: string;
};

export type ExpenseRow = {
  entry_date: string;
  category: string;
  detail: string;
  amount: number;
  note: string;
  auto_detected: boolean;
};

// 헌금 업로드 엑셀 파싱
export function parseOfferingExcel(buffer: Buffer): OfferingRow[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  return rows
    .filter((r) => r["금액"] || r["amount"])
    .map((r) => {
      const rawDate = r["날짜"] || r["date"] || "";
      const entry_date = formatDate(rawDate);
      const kindRaw = String(r["종류"] || r["kind"] || "");
      const member_name = String(r["이름"] || r["name"] || "").trim();
      const amtRaw = r["금액"] || r["amount"] || 0;
      const amount = typeof amtRaw === "number" ? amtRaw : parseKoreanAmount(String(amtRaw));
      const note = String(r["비고"] || r["note"] || "").trim();
      const kind = kindRaw || detectOfferingKind(member_name + " " + note) || "기타헌금";
      return { entry_date, kind, member_name, amount, note };
    });
}

// 지출 업로드 엑셀 파싱
export function parseExpenseExcel(buffer: Buffer): ExpenseRow[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  return rows
    .filter((r) => r["금액"] || r["amount"])
    .map((r) => {
      const rawDate = r["날짜"] || r["date"] || "";
      const entry_date = formatDate(rawDate);
      const detail = String(r["상세내역"] || r["detail"] || "").trim();
      const catRaw = String(r["계정과목"] || r["분류"] || r["category"] || "").trim();
      const amtRaw = r["금액"] || r["amount"] || 0;
      const amount = typeof amtRaw === "number" ? amtRaw : parseKoreanAmount(String(amtRaw));
      const note = String(r["비고"] || r["note"] || "").trim();
      const detected = catRaw ? catRaw : detectExpenseCat(detail) || "기타";
      const auto_detected = !catRaw && !!detectExpenseCat(detail);
      return { entry_date, category: detected, detail, amount, note, auto_detected };
    });
}

// 헌금 템플릿 엑셀 생성
export function generateOfferingTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  const headers = [["날짜", "종류", "이름", "금액", "비고"]];
  const example = [
    ["2026-05-17", "십일조헌금", "홍길동", 500000, ""],
    ["2026-05-17", "감사헌금", "김철수", 100000, "계좌입금 0517"],
    ["2026-05-17", "건축헌금", "이영희", 200000, ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet([...headers, ...example]);

  // 열 너비 설정
  ws["!cols"] = [{ wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(wb, ws, "헌금입력");

  // 종류 드롭다운 시트
  const kindWs = XLSX.utils.aoa_to_sheet([
    ["종류 목록"],
    ["십일조헌금"], ["감사헌금"], ["주일헌금"], ["건축헌금"],
    ["선교헌금"], ["구역예배헌금"], ["특별헌금"], ["절기헌금"], ["봉헌"], ["기타헌금"],
  ]);
  XLSX.utils.book_append_sheet(wb, kindWs, "종류목록(참고)");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

// 지출 템플릿 엑셀 생성
export function generateExpenseTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  const headers = [["날짜", "계정과목", "상세내역", "금액", "비고"]];
  const example = [
    ["2026-05-17", "사례비", "목사님 사례비 5월", 3400000, ""],
    ["2026-05-15", "보험료", "한화손보 05-220", 250490, ""],
    ["2026-05-11", "교회관리비", "코웨이렌탈", 26500, ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet([...headers, ...example]);
  ws["!cols"] = [{ wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, "지출입력");

  const catWs = XLSX.utils.aoa_to_sheet([
    ["계정과목 목록"],
    ["사례비"], ["교회관리비"], ["보험료"], ["현대카드"],
    ["대출이자"], ["선교비"], ["목회활동비"], ["행정비"],
    ["식비"], ["교육비"], ["구제비"], ["건축비"], ["차량비"], ["통신비"], ["기타"],
  ]);
  XLSX.utils.book_append_sheet(wb, catWs, "계정과목(참고)");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

function formatDate(raw: unknown): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const s = String(raw).trim();
  // YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s)) return s.replace(/\//g, "-");
  // Excel serial number
  if (/^\d+$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(parseInt(s));
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  return new Date().toISOString().slice(0, 10);
}
