import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const weekId = searchParams.get("week_id");
  const limit = parseInt(searchParams.get("limit") || "200");

  const rows = weekId
    ? await sql`SELECT * FROM offerings WHERE week_id = ${weekId} ORDER BY entry_date, seq_no`
    : await sql`SELECT * FROM offerings ORDER BY entry_date DESC, seq_no DESC LIMIT ${limit}`;

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { week_id, entry_date, kind, member_name, amount, note } = body;

  // 연번 자동 계산
  const seqResult = await sql`
    SELECT COALESCE(MAX(seq_no), 0) + 1 AS next_seq
    FROM offerings
    WHERE week_id = ${week_id}
  `;
  const seq_no = seqResult[0].next_seq;

  const result = await sql`
    INSERT INTO offerings (week_id, entry_date, seq_no, kind, member_name, amount, note)
    VALUES (${week_id}, ${entry_date}, ${seq_no}, ${kind}, ${member_name}, ${amount}, ${note})
    RETURNING *
  `;
  return NextResponse.json(result[0], { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await sql`DELETE FROM offerings WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
