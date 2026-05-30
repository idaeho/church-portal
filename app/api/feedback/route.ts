import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { page, content, submitter } = body;

  if (!page || !content?.trim()) {
    return NextResponse.json({ error: "page, content 필수" }, { status: 400 });
  }

  const submitterVal = submitter || "익명";
  const submitterEnc = encrypt(submitterVal);

  const result = await sql`
    INSERT INTO feedback (page, content, submitter_enc)
    VALUES (${page}, ${content.trim()}, ${submitterEnc})
    RETURNING id, page, content, status, created_at
  `;
  return NextResponse.json({ ...result[0], submitter: submitterVal }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending";

  const rows = await sql`
    SELECT id, page, content, submitter, submitter_enc, status, reviewed_at, created_at
    FROM feedback
    WHERE status = ${status}
    ORDER BY created_at DESC
  `;
  const decrypted = rows.map((r) => ({
    ...r,
    submitter: r.submitter_enc ? decrypt(r.submitter_enc as string) : (r.submitter ?? "익명"),
  }));
  return NextResponse.json(decrypted);
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
