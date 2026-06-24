import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { College } from "@/models/College";
import { Subject } from "@/models/Subject";
import { Topic } from "@/models/Topic";
import { Question } from "@/models/Question";
import { Attempt } from "@/models/Attempt";
import { User } from "@/models/User";
import { Group } from "@/models/Group";
import { requireAdmin } from "@/lib/requireAdmin";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const adminCheck = requireAdmin(req);
  if (adminCheck) return adminCheck;

  try {
    await connectDB();

    const [
      colleges,
      subjects,
      topics,
      questions,
      students,
      teachers,
      attempts,
      attemptsToday,
      activeWeek,
      freeStudents,
      paidStudents,
      totalGroups,
      totalMessages,
    ] = await Promise.all([
      College.countDocuments(),
      Subject.countDocuments(),
      Topic.countDocuments(),
      Question.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      Attempt.countDocuments(),
      Attempt.countDocuments({
        completedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      User.countDocuments({
        role: "student",
        lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      User.countDocuments({ role: "student", tier: "free" }),
      User.countDocuments({ role: "student", tier: "paid" }),
      Group.countDocuments(),
      (await import("@/models/Message")).Message.countDocuments(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        colleges,
        subjects,
        topics,
        questions,
        students,
        teachers,
        attempts,
        attemptsToday,
        activeWeek,
        freeStudents,
        paidStudents,
        totalGroups,
        totalMessages,
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
