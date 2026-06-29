import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { College } from "@/models/College";
import { Subject } from "@/models/Subject";
import { Topic } from "@/models/Topic";
import { Question } from "@/models/Question";
import { Attempt } from "@/models/Attempt";
import { User } from "@/models/User";
import { Group } from "@/models/Group";
import { University } from "@/models/University";
import { Level } from "@/models/Level";
import { Unit } from "@/models/Unit";
import { LessonProgress } from "@/models/LessonProgress";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    await connectDB();

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const registrationByDay = await User.aggregate([
      { $match: { role: "student", createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const activityByDay = await Attempt.aggregate([
      { $match: { completedAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const subjectPerformance = await Attempt.aggregate([
      {
        $group: {
          _id: "$subjectId",
          attempts: { $sum: 1 },
          avgScore: {
            $avg: {
              $multiply: [{ $divide: ["$score", { $max: ["$total", 1] }] }, 100],
            },
          },
        },
      },
      { $sort: { attempts: -1 } },
      { $limit: 5 },
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
          avgScore: { $round: ["$avgScore", 1] },
        },
      },
    ]);

    const recentStudents = await User.find({ role: "student" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email createdAt tier")
      .lean();

    const recentAttempts = await Attempt.find()
      .sort({ completedAt: -1 })
      .limit(10)
      .populate("userId", "name")
      .populate("topicId", "title")
      .lean();

    const [
      universities, colleges, subjects, levels, units, topics,
      questions, students, teachers, attempts,
      attemptsToday, attemptsWeek,
      activeToday, activeWeek,
      freeStudents, paidStudents,
      totalGroups, totalLessonsCompleted,
    ] = await Promise.all([
      University.countDocuments(),
      College.countDocuments(),
      Subject.countDocuments(),
      Level.countDocuments(),
      Unit.countDocuments(),
      Topic.countDocuments(),
      Question.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      Attempt.countDocuments(),
      Attempt.countDocuments({ completedAt: { $gte: oneDayAgo } }),
      Attempt.countDocuments({ completedAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ role: "student", lastActive: { $gte: oneDayAgo } }),
      User.countDocuments({ role: "student", lastActive: { $gte: sevenDaysAgo } }),
      User.countDocuments({ role: "student", tier: "free" }),
      User.countDocuments({ role: "student", tier: "paid" }),
      Group.countDocuments(),
      LessonProgress.countDocuments({ passedQuiz: true }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        universities, colleges, subjects, levels, units, topics,
        questions, students, teachers, attempts,
        attemptsToday, attemptsWeek,
        activeToday, activeWeek,
        freeStudents, paidStudents,
        totalGroups, totalLessonsCompleted,
        newStudentsMonth: await User.countDocuments({
          role: "student", createdAt: { $gte: thirtyDaysAgo }
        }),
        registrationByDay,
        activityByDay,
        subjectPerformance,
        recentStudents: recentStudents.map(s => ({
          id: s._id,
          name: s.name,
          email: s.email,
          tier: s.tier,
          joinedAt: s.createdAt,
        })),
        recentAttempts: recentAttempts.map((a: any) => ({
          id: a._id,
          studentName: a.userId?.name ?? "—",
          topicTitle: a.topicId?.title ?? "—",
          score: a.score,
          total: a.total,
          pct: a.total > 0 ? Math.round((a.score / a.total) * 100) : 0,
          completedAt: a.completedAt,
        })),
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
