import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Attempt } from "@/models/Attempt";
import { Topic } from "@/models/Topic";
import { Subject } from "@/models/Subject";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const attempts = await Attempt.find({ userId: auth.payload.userId })
      .sort({ completedAt: -1 })
      .limit(20)
      .lean();

    const topicIds = [...new Set(attempts.map((a) => a.topicId.toString()))];
    const subjectIds = [...new Set(attempts.map((a) => a.subjectId.toString()))];

    const [topics, subjects] = await Promise.all([
      Topic.find({ _id: { $in: topicIds } }).select("title slug").lean(),
      Subject.find({ _id: { $in: subjectIds } }).select("name").lean(),
    ]);

    const topicMap = new Map(topics.map((t) => [t._id.toString(), t]));
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), s]));

    const totalAttempts = attempts.length;
    const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
    const totalQuestions = attempts.reduce((sum, a) => sum + a.total, 0);

    const recent = attempts.slice(0, 5).map((a) => ({
      id: a._id,
      topicTitle: topicMap.get(a.topicId.toString())?.title ?? "غير معروف",
      topicSlug: topicMap.get(a.topicId.toString())?.slug ?? "",
      subjectName: subjectMap.get(a.subjectId.toString())?.name ?? "غير معروف",
      score: a.score,
      total: a.total,
      percentage: a.total > 0 ? Math.round((a.score / a.total) * 100) : 0,
      completedAt: a.completedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalAttempts,
          totalScore,
          totalQuestions,
          averagePercentage: totalQuestions > 0
            ? Math.round((totalScore / totalQuestions) * 100)
            : 0,
        },
        recent,
      },
    });
  } catch (err) {
    console.error("Get progress error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
