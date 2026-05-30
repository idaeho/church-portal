import ExcelJS from "exceljs";
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
export async function parseOfferingExcel(buffer: Buffer): Promise<OfferingRow[]> {
  const wb = new ExcelJS.Workbook();
  // exceljs Buffer 타입 정의가 @types/node Buffer<ArrayBufferLike>와 불일치 — 런타임 정상
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets[0];
  const rows = sheetToJson(ws);

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
export async function parseExpenseExcel(buffer: Buffer): Promise<ExpenseRow[]> {
  const wb = new ExcelJS.Workbook();
  // exceljs Buffer 타입 정의가 @types/node Buffer<ArrayBufferLike>와 불일치 — 런타임 정상
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets[0];
  const rows = sheetToJson(ws);

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
export async function generateOfferingTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("헌금입력");

  ws.addRow(["날짜", "종류", "이름", "금액", "비고"]);
  ws.addRow(["2026-05-17", "십일조헌금", "홍길동", 500000, ""]);
  ws.addRow(["2026-05-17", "감사헌금", "김철수", 100000, "계좌입금 0517"]);
  ws.addRow(["2026-05-17", "건축헌금", "이영희", 200000, ""]);

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 15;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 20;

  const kindWs = wb.addWorksheet("종류목록(참고)");
  [
    ["종류 목록"],
    ["십일조헌금"], ["감사헌금"], ["주일헌금"], ["건축헌금"],
    ["선교헌금"], ["구역예배헌금"], ["특별헌금"], ["절기헌금"], ["봉헌"], ["기타헌금"],
  ].forEach((row) => kindWs.addRow(row));

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// 지출 템플릿 엑셀 생성
export async function generateExpenseTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("지출입력");

  ws.addRow(["날짜", "계정과목", "상세내역", "금액", "비고"]);
  ws.addRow(["2026-05-17", "사례비", "목사님 사례비 5월", 3400000, ""]);
  ws.addRow(["2026-05-15", "보험료", "한화손보 05-220", 250490, ""]);
  ws.addRow(["2026-05-11", "교회관리비", "코웨이렌탈", 26500, ""]);

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 15;
  ws.getColumn(3).width = 25;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 20;

  const catWs = wb.addWorksheet("계정과목(참고)");
  [
    ["계정과목 목록"],
    ["사례비"], ["교회관리비"], ["보험료"], ["현대카드"],
    ["대출이자"], ["선교비"], ["목회활동비"], ["행정비"],
    ["식비"], ["교육비"], ["구제비"], ["건축비"], ["차량비"], ["통신비"], ["기타"],
  ].forEach((row) => catWs.addRow(row));

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// sheet_to_json 대체: row1을 헤더로, 이후 행을 객체로 변환
function sheetToJson(ws: ExcelJS.Worksheet): Record<string, unknown>[] {
  const headers: string[] = [];
  const result: Record<string, unknown>[] = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber] = String(cell.value ?? "");
      });
      return;
    }
    const obj: Record<string, unknown> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      // 수식 셀은 result 값 추출
      const cv = cell.value as unknown as { result?: unknown } | null;
      const val = (cv && typeof cv === "object" && "result" in cv) ? cv.result ?? "" : (cell.value ?? "");
      obj[header] = val;
    });
    result.push(obj);
  });

  return result;
}

function formatDate(raw: unknown): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const s = String(raw).trim();
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s)) return s.replace(/\//g, "-");
  // Excel 시리얼 번호 (숫자 문자열)
  if (/^\d+$/.test(s)) {
    const serial = parseInt(s, 10);
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}
