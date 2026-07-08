import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UnitExamAttempt } from "@/models/UnitExamAttempt";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    await connectDB();

    const unitId = req.nextUrl.searchParams.get("unitId");
    const userId = req.nextUrl.searchParams.get("userId");
    const passed = req.nextUrl.searchParams.get("passed");

    const filter: Record<string, unknown> = {};
    if (unitId) filter.unitId = unitId;
    if (userId) filter.userId = userId;
    if (passed === "true") filter.passed = true;
    if (passed === "false") filter.passed = false;

    const attempts = await UnitExamAttempt.find(filter)
      .populate("userId", "name email tier")
      .populate("unitId", "title")
      .populate("subjectId", "nameAr nameEn")
      .sort({ takenAt: -1 })
      .limit(500)
      .lean();

    const total = attempts.length;
    const passedCount = attempts.filter((a) => a.passed).length;
    const avgScore = total > 0 ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / total) : 0;

    return NextResponse.json({
      success: true,
      data: {
        attempts,
        stats: {
          total,
          passed: passedCount,
          failed: total - passedCount,
          passRate: total > 0 ? Math.round((passedCount / total) * 100) : 0,
          avgScore,
        },
      },
    });
  } catch (err) {
    console.error("Admin exam results error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
