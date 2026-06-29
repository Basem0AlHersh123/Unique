import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Attempt } from "@/models/Attempt";
import { Topic } from "@/models/Topic";
import { Subject } from "@/models/Subject";
import { LessonProgress } from "@/models/LessonProgress";
import { UnitExamAttempt } from "@/models/UnitExamAttempt";
import mongoose from "mongoose";
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

    const [
      lessonsWatched,
      lessonsPassed,
      unitExamAttempts,
      subjectBreakdown,
      weeklyActivity,
    ] = await Promise.all([
      LessonProgress.countDocuments({ userId: auth.payload.userId, watchedVideo: true }),
      LessonProgress.countDocuments({ userId: auth.payload.userId, passedQuiz: true }),
      UnitExamAttempt.find({ userId: auth.payload.userId })
        .sort({ takenAt: -1 })
        .limit(5)
        .lean(),
      Attempt.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(auth.payload.userId) } },
        {
          $group: {
            _id: "$subjectId",
            attempts: { $sum: 1 },
            totalScore: { $sum: "$score" },
            totalQuestions: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "subjects",
            localField: "_id",
            foreignField: "_id",
            as: "subject",
          },
        },
        { $unwind: { path: "$subject", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: "$subject.nameAr",
            nameEn: "$subject.nameEn",
            attempts: 1,
            avgPct: {
              $round: [
                { $multiply: [{ $divide: ["$totalScore", { $max: ["$totalQuestions", 1] }] }, 100] },
                1,
              ],
            },
          },
        },
      ]),
      Attempt.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(auth.payload.userId),
            completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

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
        lessonsWatched,
        lessonsPassed,
        unitExamAttempts: unitExamAttempts.map((e: any) => ({
          unitId: e.unitId,
          score: e.score,
          passed: e.passed,
          attemptNumber: e.attemptNumber,
          takenAt: e.takenAt,
        })),
        subjectBreakdown,
        weeklyActivity,
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
