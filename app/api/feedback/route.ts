import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { page, content, submitter } = body;

  if (!page || !content?.trim()) {
    return NextResponse.json({ error: "page, content 필수" }, { status: 400 });
  }

  const result = await sql`
    INSERT INTO feedback (page, content, submitter)
    VALUES (${page}, ${content.trim()}, ${submitter || "익명"})
    RETURNING *
  `;
  return NextResponse.json(result[0], { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending";

  const rows = await sql`
    SELECT * FROM feedback
    WHERE status = ${status}
    ORDER BY created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, status } = body;

  await sql`
    UPDATE feedback
    SET status = ${status}, reviewed_at = NOW()
    WHERE id = ${id}
  `;
  return NextResponse.json({ ok: true });
}
