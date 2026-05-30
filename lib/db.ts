import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type SqlFn = NeonQueryFunction<false, false>;
let _sql: SqlFn | null = null;

export function getSql(): SqlFn {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL 환경변수 없음");
    _sql = neon(process.env.DATABASE_URL) as SqlFn;
  }
  return _sql;
}

// 태그드 템플릿 리터럴 헬퍼 — await sql`...` 문법 지원
export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<Record<string, unknown>[]> {
  const fn = getSql();
  return fn(strings, ...values) as Promise<Record<string, unknown>[]>;
}


export type Offering = {
  id: number;
  week_id: string;
  entry_date: string;
  seq_no: number;
  kind: string;
  member_name: string;
  amount: number;
  note: string;
  created_at: string;
};

export type Expense = {
  id: number;
  week_id: string;
  entry_date: string;
  category: string;
  detail: string;
  amount: number;
  note: string;
  auto_detected: boolean;
  created_at: string;
};

export type Feedback = {
  id: number;
  page: string;
  content: string;
  submitter: string;
  status: string;
  created_at: string;
};

export type Member = {
  id: number;
  name: string;
  is_active: boolean;
};
