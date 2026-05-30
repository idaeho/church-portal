import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { parseOfferingExcel, parseExpenseExcel } from "@/lib/excel";
import { encrypt, hashForSearch } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string; // "offering" | "expense"
  const weekId = formData.get("week_id") as string;

  if (!file || !type || !weekId) {
    return NextResponse.json({ error: "file, type, week_id 필수" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (type === "offering") {
    const rows = parseOfferingExcel(buffer);
    let inserted = 0;

    for (const row of rows) {
      const seqResult = await sql`
        SELECT COALESCE(MAX(seq_no), 0) + 1 AS next_seq
        FROM offerings WHERE week_id = ${weekId}
      `;
      const encName  = row.member_name ? encrypt(row.member_name) : null;
      const hashName = row.member_name ? hashForSearch(row.member_name) : null;
      await sql`
        INSERT INTO offerings (week_id, entry_date, seq_no, kind, amount, note, member_name_enc, member_name_hash)
        VALUES (${weekId}, ${row.entry_date}, ${seqResult[0].next_seq},
                ${row.kind}, ${row.amount}, ${row.note}, ${encName}, ${hashName})
      `;
      inserted++;
    }
    return NextResponse.json({ ok: true, inserted, type: "offering" });
  }

  if (type === "expense") {
    const rows = parseExpenseExcel(buffer);
    let inserted = 0;

    for (const row of rows) {
      await sql`
        INSERT INTO expenses (week_id, entry_date, category, detail, amount, note, auto_detected)
        VALUES (${weekId}, ${row.entry_date}, ${row.category},
                ${row.detail}, ${row.amount}, ${row.note}, ${row.auto_detected})
      `;
      inserted++;
    }
    return NextResponse.json({ ok: true, inserted, type: "expense" });
  }

  return NextResponse.json({ error: "type은 offering|expense" }, { status: 400 });
}
