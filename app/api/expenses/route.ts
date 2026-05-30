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
    ? await sql`SELECT * FROM expenses WHERE week_id = ${weekId} ORDER BY entry_date`
    : await sql`SELECT * FROM expenses ORDER BY entry_date DESC LIMIT ${limit}`;

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { week_id, entry_date, category, detail, amount, note, auto_detected } = body;

  const result = await sql`
    INSERT INTO expenses (week_id, entry_date, category, detail, amount, note, auto_detected)
    VALUES (${week_id}, ${entry_date}, ${category}, ${detail}, ${amount}, ${note ?? ""}, ${auto_detected ?? false})
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

  await sql`DELETE FROM expenses WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
