import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Subject } from "@/models/Subject";
import { Topic } from "@/models/Topic";
import { Question } from "@/models/Question";
import { Attempt } from "@/models/Attempt";
import { requireTeacher } from "@/lib/requireTeacher";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const teacherCheck = requireTeacher(req);
  if (teacherCheck) return teacherCheck;

  try {
    const authHeader = req.headers.get("authorization")!;
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    await connectDB();

    const subjectIds = await Subject.find({ teacherIds: payload.userId }).distinct("_id");

    const [totalSubjects, totalTopics, totalQuestions, totalAttempts] = await Promise.all([
      subjectIds.length,
      Topic.countDocuments({ subjectId: { $in: subjectIds } }),
      Question.countDocuments({ subjectId: { $in: subjectIds } }),
      Attempt.countDocuments({ subjectId: { $in: subjectIds } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalSubjects,
        totalTopics,
        totalQuestions,
        totalAttempts,
      },
    });
  } catch (err) {
    console.error("Teacher stats error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
