import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

const MAX_USERS = 5;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await sql`
    SELECT id, email, name, role, created_at
    FROM users
    ORDER BY created_at ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, password, name } = await req.json();
  if (!email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "이메일, 비밀번호 필수" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호 8자 이상" }, { status: 400 });
  }

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM users`;
  if ((count as number) >= MAX_USERS) {
    return NextResponse.json({ error: `관리자 계정은 최대 ${MAX_USERS}개까지 가능합니다.` }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);
  const result = await sql`
    INSERT INTO users (email, password, name, role)
    VALUES (${email.trim()}, ${hash}, ${name?.trim() || "관리자"}, 'admin')
    ON CONFLICT (email) DO NOTHING
    RETURNING id, email, name, role, created_at
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: "이미 존재하는 이메일입니다." }, { status: 409 });
  }

  return NextResponse.json(result[0], { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });

  // 자기 자신 삭제 방지
  const [me] = await sql`SELECT id FROM users WHERE email = ${session.user?.email!} LIMIT 1`;
  if (me && String(me.id) === id) {
    return NextResponse.json({ error: "자기 자신은 삭제할 수 없습니다." }, { status: 400 });
  }

  await sql`DELETE FROM users WHERE id = ${parseInt(id)}`;
  return NextResponse.json({ ok: true });
}
