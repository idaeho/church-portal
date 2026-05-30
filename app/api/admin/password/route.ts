import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { current, newPassword } = await req.json();
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "비밀번호 8자 이상" }, { status: 400 });
  }

  const rows = await sql`SELECT password FROM users WHERE email = ${session.user?.email} LIMIT 1`;
  if (!rows.length) return NextResponse.json({ error: "사용자 없음" }, { status: 404 });

  const ok = await bcrypt.compare(current, rows[0].password);
  if (!ok) return NextResponse.json({ error: "현재 비밀번호 불일치" }, { status: 403 });

  const hash = await bcrypt.hash(newPassword, 12);
  await sql`UPDATE users SET password = ${hash}, updated_at = NOW() WHERE email = ${session.user?.email}`;

  return NextResponse.json({ ok: true });
}
