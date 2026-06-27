import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Subject } from "@/models/Subject";
import { Topic } from "@/models/Topic";
import { Question } from "@/models/Question";
import { requireTeacher } from "@/lib/requireTeacher";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const teacherCheck = requireTeacher(req);
  if (teacherCheck) return teacherCheck;

  try {
    const authHeader = req.headers.get("authorization")!;
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);
    const userId = payload.userId;

    await connectDB();

    const subjects = await Subject.find({ teacherIds: userId })
      .select("name nameAr nameEn")
      .lean();

    const subjectIds = subjects.map((s) => s._id);

    const [topicsCount, questionsCount] = await Promise.all([
      Topic.countDocuments({ teacherId: userId }),
      Question.countDocuments({ subjectId: { $in: subjectIds } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        subjectsCount: subjects.length,
        topicsCount,
        questionsCount,
        subjects,
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
