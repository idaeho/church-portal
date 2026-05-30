import { NextRequest, NextResponse } from "next/server";
import { generateOfferingTemplate, generateExpenseTemplate } from "@/lib/excel";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "offering") {
    const buf = await generateOfferingTemplate();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="헌금입력_템플릿.xlsx"',
      },
    });
  }

  if (type === "expense") {
    const buf = await generateExpenseTemplate();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="지출입력_템플릿.xlsx"',
      },
    });
  }

  return NextResponse.json({ error: "type=offering|expense" }, { status: 400 });
}
