import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Question } from "@/models/Question";
import { Subject } from "@/models/Subject";
import { requireTeacher } from "@/lib/requireTeacher";
import { verifyAccessToken } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const teacherCheck = requireTeacher(req);
  if (teacherCheck) return teacherCheck;

  try {
    const authHeader = req.headers.get("authorization")!;
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAccessToken(token);
    const { id } = await params;

    await connectDB();

    const question = await Question.findById(id);
    if (!question) {
      return NextResponse.json(
        { success: false, error: "السؤال غير موجود" },
        { status: 404 }
      );
    }

    const subj = await Subject.findById(question.subjectId);
    if (
      payload.role !== "admin" &&
      subj &&
      !subj.teacherIds.map((tid: unknown) => String(tid)).includes(payload.userId)
    ) {
      return NextResponse.json(
        { success: false, error: "لا يمكنك حذف هذا السؤال" },
        { status: 403 }
      );
    }

    await Question.findOneAndDelete({ _id: id });

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("Teacher delete exam question error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
