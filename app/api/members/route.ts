import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { encrypt, decrypt, hashForSearch } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  let rows;
  if (query) {
    const hash = hashForSearch(query);
    rows = await sql`SELECT * FROM members WHERE name_hash = ${hash} AND is_active = true ORDER BY name`;
  } else {
    rows = await sql`SELECT * FROM members WHERE is_active = true ORDER BY name LIMIT 200`;
  }

  const decrypted = rows.map((r) => ({
    ...r,
    name: r.name_enc ? decrypt(r.name_enc as string) : (r.name ?? ""),
  }));
  return NextResponse.json(decrypted);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name 필수" }, { status: 400 });

  const encName  = encrypt(name.trim());
  const hashName = hashForSearch(name.trim());

  const result = await sql`
    INSERT INTO members (name_enc, name_hash)
    VALUES (${encName}, ${hashName})
    ON CONFLICT DO NOTHING
    RETURNING id, is_active, created_at
  `;
  return NextResponse.json(result[0] ? { ...result[0], name: name.trim() } : { message: "이미 존재" }, { status: 201 });
}
