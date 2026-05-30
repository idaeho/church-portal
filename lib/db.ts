import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL 환경변수 없음");
}

export const sql = neon(process.env.DATABASE_URL);

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
