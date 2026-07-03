import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Vocabulary } from "@/models/Vocabulary";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const collegeId = req.nextUrl.searchParams.get("collegeId");
    const subjectId = req.nextUrl.searchParams.get("subjectId");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "10");

    if (!collegeId) {
      return NextResponse.json({ success: false, error: "collegeId مطلوب" }, { status: 400 });
    }

    const filter: Record<string, unknown> = { collegeId, isPublished: true };
    if (subjectId) filter.subjectId = subjectId;

    const words = await Vocabulary.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({ success: true, data: words });
  } catch {
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
