import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Question } from "@/models/Question";
import { Subject } from "@/models/Subject";
import { requireTeacher } from "@/lib/requireTeacher";
import { verifyAccessToken } from "@/lib/auth";

const updateSchema = z.object({
  question: z.string().min(2).optional(),
  options: z.array(z.string()).min(2).max(6).optional(),
  correctAnswer: z.number().min(0).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  explanation: z.string().optional(),
  isPublished: z.boolean().optional(),
  order: z.number().optional(),
});

export async function PATCH(
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
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const question = await Question.findById(id);
    if (!question) {
      return NextResponse.json(
        { success: false, error: "السؤال غير موجود" },
        { status: 404 }
      );
    }

    if (payload.role !== "admin") {
      const subj = await Subject.findById(question.subjectId);
      if (
        !subj ||
        !subj.teacherIds.map((tid: unknown) => (tid as { toString(): string }).toString()).includes(payload.userId)
      ) {
        return NextResponse.json(
          { success: false, error: "لا يمكنك تعديل هذا السؤال" },
          { status: 403 }
        );
      }
    }

    if (parsed.data.correctAnswer !== undefined && parsed.data.options) {
      if (parsed.data.correctAnswer >= parsed.data.options.length) {
        return NextResponse.json(
          { success: false, error: "الإجابة الصحيحة خارج نطاق الخيارات" },
          { status: 400 }
        );
      }
    }

    Object.assign(question, parsed.data);
    await question.save();

    return NextResponse.json({ success: true, data: question });
  } catch (err) {
    console.error("Teacher update question error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}

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

    if (payload.role !== "admin") {
      const subj = await Subject.findById(question.subjectId);
      if (
        !subj ||
        !subj.teacherIds.map((tid: unknown) => (tid as { toString(): string }).toString()).includes(payload.userId)
      ) {
        return NextResponse.json(
          { success: false, error: "لا يمكنك حذف هذا السؤال" },
          { status: 403 }
        );
      }
    }

    await Question.findByIdAndDelete(id);
    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    console.error("Teacher delete question error:", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
